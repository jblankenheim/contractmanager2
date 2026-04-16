const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;
const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'MODIFY') continue;

    const newImage = record.dynamodb.NewImage;

    const contractType = newImage.contractType?.S;
    const contractNumber = newImage.contractNumber?.S;
    const transactionsJson = newImage.transactionDates?.S;

    if (!contractType || !contractNumber || !transactionsJson) {
      console.log('Skipping record: missing required fields');
      continue;
    }

    let transactions;
    try {
      transactions = JSON.parse(transactionsJson);
    } catch {
      console.warn(`Invalid transaction JSON for ${contractType}_${contractNumber}`);
      continue;
    }

    try {
      /* ===============================
         1. Build PDF from scratch
      ================================ */

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Courier);

      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      let y = height - 50;

      page.drawText('TRANSACTION SUMMARY', {
        x: 50,
        y,
        size: 18,
        font
      });

      y -= 30;

      page.drawText(
        'Date         Quantity        Remaining',
        { x: 50, y, size: 12, font }
      );

      y -= 15;

      transactions.forEach(t => {
        const line = `${String(t.date || '').padEnd(12)} ` +
                     `${String(t.quantity || '').padEnd(14)} ` +
                     `${String(t.remainingQuantity || '')}`;

        page.drawText(line, {
          x: 50,
          y,
          size: 10,
          font
        });

        y -= 14;
        if (y < 50) {
          y = height - 50;
          page = pdfDoc.addPage();
        }
      });

      const pdfBytes = await pdfDoc.save();

      /* ===============================
         2. Save to S3
      ================================ */

      const transactionKey =
        `public/contracts/${contractType}/${contractNumber}/transaction.pdf`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: transactionKey,
        Body: pdfBytes,
        ContentType: 'application/pdf'
      }));

      /* ===============================
         3. Update DynamoDB
      ================================ */

      const id = `${contractType}_${contractNumber}`;

      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET transactionKey = :k',
        ExpressionAttributeValues: {
          ':k': transactionKey
        }
      }));

      console.log(`Transaction PDF generated for ${id}`);
    } catch (err) {
      console.error('Error generating transaction PDF:', err);
    }
  }
};
