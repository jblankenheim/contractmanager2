const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// FALLBACK: Uses your explicit table name if env vars are missing/null
const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME || 
                   process.env.tableName || 
                   "Contract-q45dzeansvb35iprjcnjiiszhy-dev";

const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

exports.handler = async (event) => {
    console.log("Attempting scan on table:", TABLE_NAME);

    try {
        const { Items } = await ddb.send(new ScanCommand({
            TableName: TABLE_NAME, // Fixed: SDK v3 requires capitalized 'TableName'
            FilterExpression: "needsTransactionKey = :t",
            ExpressionAttributeValues: { ":t": true }
        }));

        if (!Items || Items.length === 0) {
            console.log("No contracts found to process.");
            return { message: "No flagged contracts" };
        }

        for (const contract of Items) {
            try {
                const { contractType, contractNumber, transactionDates, id } = contract;

                // Build PDF
                const pdfDoc = await PDFDocument.create();
                const font = await pdfDoc.embedFont(StandardFonts.Courier);
                let page = pdfDoc.addPage();
                const { height } = page.getSize();
                let y = height - 50;

                page.drawText('TRANSACTION SUMMARY', { x: 50, y, size: 18, font });
                y -= 45;

                (transactionDates || []).forEach(t => {
                    const line = `${String(t.date || '').padEnd(12)} ${String(t.quantity || '').padEnd(14)} ${String(t.remainingQuantity || '')}`;
                    page.drawText(line, { x: 50, y, size: 10, font });
                    y -= 14;
                    if (y < 50) { y = height - 50; page = pdfDoc.addPage(); }
                });

                const pdfBytes = await pdfDoc.save();
                const transactionKey = `public/contracts/${contractType}/${contractNumber}/transaction.pdf`;

                // Upload to S3
                await s3.send(new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: transactionKey,
                    Body: pdfBytes,
                    ContentType: 'application/pdf'
                }));

                // Update DynamoDB (Reset flag)
                await ddb.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                    UpdateExpression: 'SET transactionKey = :k, needsTransactionKey = :f, updatedAt = :u',
                    ExpressionAttributeValues: { 
                        ':k': transactionKey,
                        ':f': false, 
                        ':u': new Date().toISOString()
                    }
                }));

                console.log(`Success: Generated PDF for ${id}`);
            } catch (err) {
                console.error(`Failed individual contract ${contract.id}:`, err);
            }
        }
    } catch (err) {
        console.error("Top-level Scan Error. Check table permissions:", err);
        throw err;
    }
};