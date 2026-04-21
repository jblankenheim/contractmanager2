const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

exports.handler = async (event) => {
  try {
    // 1. Find contracts needing updates
    const { Items } = await ddb.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "needsTransactionKey = :t",
      ExpressionAttributeValues: { ":t": true }
    }));

    if (!Items || Items.length === 0) return { message: "No flagged contracts" };

    for (const contract of Items) {
      try {
        const { 
            id, 
            contractType, 
            contractNumber, 
            transactionDates, 
            pictureKey, 
            locked = false, 
            transactionKeyPages = 0 
        } = contract;

        // ==================================================
        // STEP 1: GENERATE TRANSACTIONS PDF
        // ==================================================
        const transDoc = await PDFDocument.create();
        const font = await transDoc.embedFont(StandardFonts.Courier);
        const boldFont = await transDoc.embedFont(StandardFonts.CourierBold);

        let currentPage = transDoc.addPage();
        let { width, height } = currentPage.getSize();
        let y = height - 50;

        // Header
        currentPage.drawText(`Transactions for contract ID: ${id}`, { 
            x: 50, y, size: 14, font: boldFont 
        });
        y -= 40;

        // Table Header
        currentPage.drawText(
          "Date         Quantity       Remaining     Dollars       Check#", 
          { x: 50, y, size: 10, font: boldFont }
        );
        y -= 20;

        // Table Rows
        (transactionDates || []).forEach(t => {
          const dateStr = String(t.date || '').padEnd(12);
          const qtyStr = String(t.quantity || '').padEnd(14);
          const remStr = String(t.remainingQuantity || '').padEnd(12);
          const dolStr = String(t.dollars || '').padEnd(12);
          const chkStr = String(t.checkNumber || '');

          const line = `${dateStr} ${qtyStr} ${remStr} ${dolStr} ${chkStr}`;

          currentPage.drawText(line, { x: 50, y, size: 10, font });
          y -= 14;

          if (y < 50) {
            currentPage = transDoc.addPage();
            y = height - 50;
          }
        });

        const transPdfBytes = await transDoc.save();
        const newTransPageCount = transDoc.getPageCount();

        // ==================================================
        // STEP 2: SAVE TRANSACTION PDF TO S3
        // ==================================================
        const transKey = `public/contracts/${contractType}/${contractNumber}/transactions_${Date.now()}.pdf`;
        
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: transKey,
          Body: transPdfBytes,
          ContentType: 'application/pdf'
        }));

        // Prepare DB Update
        let updateExpression = 'SET needsTransactionKey = :f, updatedAt = :u, transactionKey = :tk';
        let expValues = {
          ':f': false,
          ':u': new Date().toISOString(),
          ':tk': transKey
        };

        // ==================================================
        // STEP 3: HANDLE LOCKED CONTRACTS (Append Logic)
        // ==================================================
        if (locked && pictureKey) {
            console.log(`Contract ${id} is LOCKED. Updating pictureKey PDF...`);

            // Load original PDF
            const originalObj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: pictureKey }));
            const originalBytes = await originalObj.Body.transformToByteArray();
            const mainDoc = await PDFDocument.load(originalBytes);

            // Remove old appended pages
            const pagesToRemove = Number.isInteger(transactionKeyPages) ? transactionKeyPages : 0;
            const totalPages = mainDoc.getPageCount();
            const safeToRemove = Math.min(pagesToRemove, totalPages);

            for (let i = 0; i < safeToRemove; i++) {
                mainDoc.removePage(mainDoc.getPageCount() - 1);
            }

            // Append new transaction pages
            const freshTransDoc = await PDFDocument.load(transPdfBytes);
            const copiedPages = await mainDoc.copyPages(freshTransDoc, freshTransDoc.getPageIndices());
            copiedPages.forEach((page) => mainDoc.addPage(page));

            // Save updated PDF
            const updatedMainBytes = await mainDoc.save();
            
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: pictureKey,
                Body: updatedMainBytes,
                ContentType: 'application/pdf'
            }));

            // Update DB with new page count
            updateExpression += ', transactionKeyPages = :tkp';
            expValues[':tkp'] = newTransPageCount;
        }

        // ==================================================
        // STEP 4: FINAL DB UPDATE
        // ==================================================
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expValues
        }));

        console.log(`Successfully processed ${id}`);
      } catch (err) {
        console.error(`Error processing contract ${contract.id}:`, err);
      }
    }

    return { message: "Processing complete" };
  } catch (err) {
    console.error("Scan Error:", err);
    throw err;
  }
};
