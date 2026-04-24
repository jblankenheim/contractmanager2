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
            transactionDates = [], 
            pictureKey, 
            locked = false, 
            transactionKeyPages = 0 
        } = contract;

        // 1. GENERATE THE TRANSACTION PDF
        const transDoc = await PDFDocument.create();
        const font = await transDoc.embedFont(StandardFonts.Courier);
        const boldFont = await transDoc.embedFont(StandardFonts.CourierBold);

        let currentPage = transDoc.addPage();
        const { width, height } = currentPage.getSize();
        let y = height - 50;

        currentPage.drawText(`Transactions for contract ID: ${id}`, { x: 50, y, size: 14, font: boldFont });
        y -= 40;

        currentPage.drawText("Date         Quantity  Remaining Dollars   Settled To      Check#", { x: 50, y, size: 10, font: boldFont });
        y -= 20;

        transactionDates.forEach(t => {
            const line = `${String(t.date || '').padEnd(13)}${String(t.quantity || '').padEnd(10)}${String(t.remainingQuantity || '').padEnd(10)}${String(t.dollars || '').padEnd(10)}${String(t.settledTo || '').substring(0, 14).padEnd(16)}${String(t.checkNumber || '')}`;
            currentPage.drawText(line, { x: 50, y, size: 10, font });
            y -= 14;

            if (y < 50) {
                currentPage = transDoc.addPage();
                y = height - 50;
            }
        });

        const transPdfBytes = await transDoc.save();
        const newTransPageCount = transDoc.getPageCount();

        // 2. SAVE STANDALONE TRANSACTION PDF
        const transKey = `public/contracts/${contractType}/${contractNumber}/transactions_${Date.now()}.pdf`;
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: transKey,
          Body: transPdfBytes,
          ContentType: 'application/pdf'
        }));

        // 3. APPEND TO PICTUREKEY (ONLY IF LOCKED)
        if (locked && pictureKey) {
            console.log(`Updating ${pictureKey} for contract ${id}`);
            
            const originalObj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: pictureKey }));
            const originalBytes = await originalObj.Body.transformToByteArray();
            const mainDoc = await PDFDocument.load(originalBytes);

            // Safety cleanup: Remove exactly the number of pages we previously added
            const pagesToRemove = parseInt(transactionKeyPages || 0, 10);
            const totalPagesBefore = mainDoc.getPageCount();
            
            // Never delete the entire document; leave at least 1 page (the contract)
            const safeToRemove = Math.min(pagesToRemove, totalPagesBefore - 1);

            for (let i = 0; i < safeToRemove; i++) {
                mainDoc.removePage(mainDoc.getPageCount() - 1);
            }

            // Append new pages
            const freshTransDoc = await PDFDocument.load(transPdfBytes);
            const copiedPages = await mainDoc.copyPages(freshTransDoc, freshTransDoc.getPageIndices());
            copiedPages.forEach(p => mainDoc.addPage(p));

            const updatedMainBytes = await mainDoc.save();
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: pictureKey,
                Body: updatedMainBytes,
                ContentType: 'application/pdf'
            }));
        }

        // 4. DATABASE UPDATE
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: 'SET needsTransactionKey = :f, updatedAt = :u, transactionKey = :tk, transactionKeyPages = :tkp',
            ExpressionAttributeValues: {
                ':f': false,
                ':u': new Date().toISOString(),
                ':tk': transKey,
                ':tkp': newTransPageCount
            }
        }));

        console.log(`Success: ${id}`);
      } catch (err) {
        console.error(`Failed contract ${contract.id}:`, err);
      }
    }
    return { message: "Done" };
  } catch (err) {
    console.error("Scan Error:", err);
    throw err;
  }
};
