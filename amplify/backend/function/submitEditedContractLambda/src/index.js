const { S3Client, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME?.trim();
const BUCKET = process.env.CONTRACT_BUCKET?.trim();

const ALLOWED_CONTRACT_TYPES = new Set([
    "BASIS_FIXED", "DEFERRED_PAYMENT", "PRICE_LATER", "EXTENDED_PRICING",
    "CASH_BUY", "MINIMUM_PRICED", "HEDGED_TO_ARRIVE", "UNASSIGNED",
]);

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
};

exports.handler = async (event) => {
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
        const { sourceKey, contractType, contractNumber, pdfType = "contract" } = body;

        // 1. VALIDATION
        if (!sourceKey || !contractType || !contractNumber) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
        }
        if (!ALLOWED_CONTRACT_TYPES.has(contractType)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid contractType: ${contractType}` }) };
        }

        const contractNumberStr = contractNumber.trim();
        const contractId = `${contractType}_${contractNumberStr}`;
        const now = new Date().toISOString();
        const timestamp = Date.now();
        const isAddendum = pdfType === "addendum";

        // 2. FETCH EXISTING
        const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { id: contractId } }));

        // ✅ 3. LOCKED CHECK (Now routes to unassigned and alerts)
        if (existing.Item?.locked === true) {
            const lockedDestination = `public/unassigned/LOCKED_${timestamp}.pdf`;
            await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `${BUCKET}/${sourceKey}`, Key: lockedDestination }));
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: sourceKey }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    locked: true,
                    redirected: true,
                    message: "This contract is LOCKED. File was moved to unassigned and no changes were made to the record.",
                    path: lockedDestination
                })
            };
        }

        // 4. PATH LOGIC
        let destinationKey;
        let redirected = false;

        if (isAddendum) {
            destinationKey = `public/contracts/${contractType}/${contractNumberStr}/addendum_${timestamp}.pdf`;
        } else if (existing.Item?.pictureKey) {
            destinationKey = `public/unassigned/${timestamp}.pdf`;
            redirected = true;
        } else {
            destinationKey = `public/contracts/${contractType}/${contractNumberStr}.pdf`;
        }

        // 5. S3 MOVE
        await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `${BUCKET}/${sourceKey}`, Key: destinationKey }));
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: sourceKey }));

        let resultItem;

        // 6. DB OPERATION (Handles createdAt / updatedAt)
        if (!existing.Item) {
            // OPEN NEW: Both Created and Updated
            resultItem = {
                id: contractId,
                contractType,
                contractNumber: contractNumberStr,
                pdfType,
                [isAddendum ? "addendum1" : "pictureKey"]: destinationKey,
                signed: true,
                createdAt: now,
                updatedAt: now,
            };
            await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: resultItem }));
        } else {
            // UPDATE EXISTING: Only Updated
            let updateExpression;
            let expressionValues = { ":u": now };

            if (isAddendum) {
                const fieldName = existing.Item.addendum1 ? "addendum2" : "addendum1";
                updateExpression = `SET ${fieldName} = :path, updatedAt = :u`;
                expressionValues[":path"] = destinationKey;
            } else if (redirected) {
                updateExpression = `SET pdfType = :t, updatedAt = :u, duplicateKey = list_append(if_not_exists(duplicateKey, :empty), :d)`;
                expressionValues[":t"] = pdfType;
                expressionValues[":d"] = [destinationKey];
                expressionValues[":empty"] = [];
            } else {
                updateExpression = `SET pdfType = :t, pictureKey = :pk, signed = :s, updatedAt = :u`;
                expressionValues[":t"] = pdfType;
                expressionValues[":pk"] = destinationKey;
                expressionValues[":s"] = true;
            }

            const updated = await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id: contractId },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionValues,
                ReturnValues: "ALL_NEW",
            }));
            resultItem = updated.Attributes;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                item: resultItem,
                redirected,
                message: isAddendum ? "Addendum saved." : (redirected ? "Existing image found. Added to duplicate history." : "Success")
            }),
        };

    } catch (err) {
        console.error("ERROR:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Server Error", message: err.message }) };
    }
};
