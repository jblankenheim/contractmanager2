
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

// ---- ENV VARS ----
const TABLE_NAME = process.env.TABLE_NAME?.trim();
const BUCKET = process.env.CONTRACT_BUCKET?.trim();

if (!TABLE_NAME || !BUCKET) {
  throw new Error("Missing TABLE_NAME or CONTRACT_BUCKET environment variables");
}

// ---- CORS ----
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

    if (!sourceKey || !contractType || contractNumber === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // ---- ✅ NORMALIZE CONTRACT NUMBER AS NUMBER ----
    const contractNumberStr = String(contractNumber).trim();

    if (!contractNumberStr) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "contractNumber is required",
        }),
      };
    }

    const contractId = `${contractType}_${contractNumberStr}`;
    const sourceKeyFull = sourceKey;

    const destinationKey =
      `public/contracts/${contractType}/${contractNumberStr}.pdf`;

    console.log("Processing contract submission:", {
      contractId,
      sourceKey: sourceKeyFull,
      destinationKey,
    });

    // --------------------------------------------------
    // 1️⃣ COPY CONTRACT (CRITICAL STEP)
    // --------------------------------------------------
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${sourceKeyFull}`, // do NOT encode
        Key: destinationKey,
      })
    );

    console.log("S3 copy completed");

    // --------------------------------------------------
    // 2️⃣ WRITE / UPDATE DYNAMODB (SOURCE OF TRUTH)
    // --------------------------------------------------
    const now = new Date().toISOString();

    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: contractId },
      })
    );

    let resultItem;

    if (!existing.Item) {
      // ✅ New contract — store pdfKey as pictureKey (string)
      resultItem = {
        id: contractId,
        contractType,
        contractNumber: contractNumberStr,
        pictureKey: destinationKey,   // ← string, not array
        pdfType,
        signed: true,
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
      // ✅ Duplicate — move to duplicates folder, append to duplicateKey
      const duplicatePath = `public/duplicates/${contractId}/${Date.now()}.pdf`;

      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${destinationKey}`,
          Key: duplicatePath,
        })
      );

      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: destinationKey,
        })
      );

      console.log("Duplicate moved to:", duplicatePath);

      const updated = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: contractId },
          UpdateExpression: `
        SET
          pdfType = :t,
          contractNumber = :n,
          signed = :s,
          updatedAt = :u,
          duplicateKey = list_append(if_not_exists(duplicateKey, :emptyList), :newDuplicate)
      `,
          ExpressionAttributeValues: {
            ":t": pdfType,
            ":n": contractNumberStr,
            ":s": true,
            ":u": now,
            ":newDuplicate": [duplicatePath],
            ":emptyList": [],
          },
          ReturnValues: "ALL_NEW",
        })
      );

      resultItem = updated.Attributes;
      console.log("DynamoDB item updated with duplicate");
    }

    // --------------------------------------------------
    // 3️⃣ DELETE SOURCE FILE (BEST‑EFFORT CLEANUP)
    // --------------------------------------------------
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
        console.log("Source object already deleted (safe)");
      }
    }

    // --------------------------------------------------
    // ✅ SUCCESS
    // --------------------------------------------------
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
}