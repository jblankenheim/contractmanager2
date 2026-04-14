const {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET = process.env.CONTRACT_BUCKET;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const {
      sourceKey,
      contractType,
      contractNumber,
      pdfType = "contract",
    } = body;

    if (!sourceKey || !contractType || !contractNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const contractId = `${contractType}_${contractNumber}`;

    // ✅ sourceKey must already be the real S3 key (including public/)
    const sourceKeyFull = sourceKey;

    // ✅ deterministic destination
    const destinationKey = `public/contracts/${contractType}/${contractNumber}.pdf`;

    console.log("Processing contract submission:", {
      contractId,
      sourceKey: sourceKeyFull,
      destinationKey,
    });

    // ------------------------------------------------------------
    // 1. COPY OBJECT (CRITICAL)
    // ------------------------------------------------------------
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${sourceKeyFull}`, // ⬅️ DO NOT encodeURIComponent
        Key: destinationKey,
      })
    );

    console.log("S3 copy completed");

    // ------------------------------------------------------------
    // 2. WRITE / UPDATE DYNAMODB (SOURCE OF TRUTH)
    // ------------------------------------------------------------
    const now = new Date().toISOString();

    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: contractId },
      })
    );

    let resultItem;

    if (!existing.Item) {
      resultItem = {
        id: contractId,
        contractType,
        contractNumber,
        pdfKey: destinationKey,
        pdfType,
        createdAt: now,
      };

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: resultItem,
        })
      );

      console.log("DynamoDB item created");
    } else {
      const updated = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: contractId },
          UpdateExpression:
            "SET pdfKey = :k, pdfType = :t, updatedAt = :u",
          ExpressionAttributeValues: {
            ":k": destinationKey,
            ":t": pdfType,
            ":u": now,
          },
          ReturnValues: "ALL_NEW",
        })
      );

      resultItem = updated.Attributes;
      console.log("DynamoDB item updated");
    }

    // ------------------------------------------------------------
    // 3. CLEANUP SOURCE OBJECT (BEST‑EFFORT, NEVER FATAL)
    // ------------------------------------------------------------
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: sourceKeyFull,
        })
      );
      console.log("Source object deleted");
    } catch (err) {
      if (err.name !== "NoSuchKey") {
        console.warn("Non‑fatal S3 cleanup error:", err);
      } else {
        console.log("Source object already removed (safe to ignore)");
      }
    }

    // ------------------------------------------------------------
    // ✅ SUCCESS
    // ------------------------------------------------------------
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(resultItem),
    };
  } catch (err) {
    console.error("UNHANDLED ERROR:", err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: err.message,
      }),
    };
  }
};
