import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = "Contract-q45dzeansvb35iprjcnjiiszhy-dev";

export const handler = async (event) => {
    console.log("Full Event Received:", JSON.stringify(event));

    // Fix: Properly extract data without causing a Syntax Error
    const body = event.arguments || (event.body ? JSON.parse(event.body) : event);
    const { contractID, userName, closed, canceled, notes } = body;
    console.log(`Parsed Variables -> ID: ${contractID}, User: ${userName}, Canceled: ${canceled}`);

    const today = new Date().toISOString().split('T')[0]; 

    try {
        if (!contractID) {
            throw new Error("Missing contractID in event payload");
        }

        // 1. Fetch current contract
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
                ":cb": userName || "Unknown User", 
                ":cd": today, 
                ":cad": canceled ? today : (contract.canceledDate || ""), 
                ":n": updatedNotes, 
                ":cls": closed || false, 
                ":cnl": canceled || false 
            } 
        }));

        // 4. Handle PDF Watermarking
        if (contract.pictureKey && canceled) {
            const bucket = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;
            const getObj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: contract.pictureKey }));
            const pdfBytes = await getObj.Body.transformToByteArray();
            
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];     
            const { width, height } = firstPage.getSize();
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            const watermarkText = `CANCELLED - ${today} - ${userName}`;
            const textWidth = helveticaBold.widthOfTextAtSize(watermarkText, 30);

            firstPage.drawText(watermarkText, { 
                x: width / 2 - textWidth / 2, 
                y: height / 2, 
                size: 30, 
                font: helveticaBold, 
                color: rgb(1, 0, 0), 
                opacity: 0.6 
            });

            const modifiedPdfBytes = await pdfDoc.save();
            await s3Client.send(new PutObjectCommand({ 
                Bucket: bucket, 
                Key: contract.pictureKey, 
                Body: modifiedPdfBytes, 
                ContentType: "application/pdf" 
            }));
        }

        return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };

    } catch (error) {
        console.error("Handler Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};