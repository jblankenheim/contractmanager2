import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = "Contract-q45dzeansvb35iprjcnjiiszhy-dev";

export const handler = async (event) => {
    const { contractID, userName, closed, canceled, notes } = event;
    const today = new Date().toISOString().split('T')[0]; // AWSDate format: YYYY-MM-DD

    try {
        // 1. Fetch current contract for existing notes and pictureKey
        const getResult = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: contractID }
        }));

        const contract = getResult.Item;
        if (!contract) throw new Error("Contract not found");

        // 2. Prepare updated notes
        const existingNotes = contract.notes || "";
        const updatedNotes = `${existingNotes}\n[${today}]: ${notes}`.trim();

        // 3. Update DynamoDB
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: contractID },
            UpdateExpression: "SET closedBy = :cb, closedDate = :cd, canceledDate = :cad, notes = :n, closed = :cls, canceled = :cnl",
            ExpressionAttributeValues: {
                ":cb": userName,
                ":cd": today,
                ":cad": canceled ? today : (contract.canceledDate || null),
                ":n": updatedNotes,
                ":cls": closed,
                ":cnl": canceled
            }
        }));

        // 4. Handle PDF Watermarking if pictureKey exists
        if (contract.pictureKey && canceled) {
            const bucket = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;
            
            // Get PDF from S3
            const getObj = await s3Client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: contract.pictureKey
            }));
            const pdfBytes = await getObj.Body.transformToByteArray();

            // Load and Modify PDF
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const watermarkText = `CANCELLED - ${today} - ${userName}`;
            
            firstPage.drawText(watermarkText, {
                x: width / 2 - 150, // Approximate centering
                y: height / 2,
                size: 30,
                font: helveticaBold,
                color: rgb(1, 0, 0), // Red
                opacity: 0.6,
            });

            // Save and Upload back to S3
            const modifiedPdfBytes = await pdfDoc.save();
            await s3Client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: contract.pictureKey,
                Body: modifiedPdfBytes,
                ContentType: "application/pdf"
            }));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Contract updated and watermarked successfully" })
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
