const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME || "Contract-q45dzeansvb35iprjcnjiiszhy-dev";
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
                const { contractType, contractNumber, transactionDates, id, pictureKey } = contract;

                // 1. Create the Transactions PDF
                const transDoc = await PDFDocument.create();
                const font = await transDoc.embedFont(StandardFonts.Courier);
                let currentTransPage = transDoc.addPage();
                let y = currentTransPage.getSize().height - 50;

                // Requirement: Header text
                currentTransPage.drawText(`Transactions for ContractID: ${id}`, { x: 50, y, size: 14, font });
                y -= 40;

                (transactionDates || []).forEach(t => {
                    const line = `${String(t.date || '').padEnd(12)} ${String(t.quantity || '').padEnd(14)} ${String(t.remainingQuantity || '')}`;
                    currentTransPage.drawText(line, { x: 50, y, size: 10, font });
                    y -= 14;
                    if (y < 50) {
                        currentTransPage = transDoc.addPage();
                        y = currentTransPage.getSize().height - 50;
                    }
                });

                // 2. Load existing pictureKey and merge
                const finalDoc = await PDFDocument.create();

                if (pictureKey) {
                    const originalS3 = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: pictureKey }));
                    const originalBytes = await originalS3.Body.transformToByteArray();
                    const originalDoc = await PDFDocument.load(originalBytes);
                    
                    // Copy ONLY Page 1 from the original
                    if (originalDoc.getPageCount() > 0) {
                        const [firstPage] = await finalDoc.copyPages(originalDoc, [0]);
                        finalDoc.addPage(firstPage);
                    }
                }

                // 3. Append all transaction pages to the final document
                const transBytes = await transDoc.save();
                const tempTransDoc = await PDFDocument.load(transBytes);
                const transPages = await finalDoc.copyPages(tempTransDoc, tempTransDoc.getPageIndices());
                transPages.forEach(p => finalDoc.addPage(p));

                const finalPdfBytes = await finalDoc.save();

                // 4. Update S3 and DynamoDB
                await s3.send(new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: pictureKey, // Overwriting original pictureKey
                    Body: finalPdfBytes,
                    ContentType: 'application/pdf'
                }));

                await ddb.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                    UpdateExpression: 'SET needsTransactionKey = :f, updatedAt = :u',
                    ExpressionAttributeValues: { ':f': false, ':u': new Date().toISOString() }
                }));

                console.log(`Updated PDF for ${id}`);
            } catch (err) {
                console.error(`Error processing ${contract.id}:`, err);
            }
        }
    } catch (err) {
        console.error("Scan Error:", err);
        throw err;
    }
};