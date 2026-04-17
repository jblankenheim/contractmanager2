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

const TABLE_NAME = process.env.TABLE_NAME?.trim();
const BUCKET = process.env.CONTRACT_BUCKET?.trim();

if (!TABLE_NAME || !BUCKET) {
  throw new Error("Missing TABLE_NAME or CONTRACT_BUCKET env vars");
}

// --------------------
// VALIDATION
// --------------------
const ALLOWED_CONTRACT_TYPES = new Set([
  "BASIS_FIXED",
  "DEFERRED_PAYMENT",
  "PRICED_LATER",
  "EXTENDED_PRICING",
  "CASH_BUY",
  "MINIMUM_PRICED",
  "HEDGED_TO_ARRIVE",
  "UNASSIGNED",
]);

function isValidString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

function badRequest(msg) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: msg }),
  };
}

// --------------------
// HANDLER
// --------------------
exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};

    const { sourceKey, contractType, contractNumber, pdfType = "contract" } =
      body;

    // --------------------
    // VALIDATION
    // --------------------
    if (!isValidString(sourceKey)) return badRequest("sourceKey required");
    if (!isValidString(contractType)) return badRequest("contractType required");
    if (!ALLOWED_CONTRACT_TYPES.has(contractType)) {
      return badRequest(`Invalid contractType: ${contractType}`);
    }
    if (!isValidString(contractNumber)) return badRequest("contractNumber required");

    const contractNumberStr = contractNumber.trim();
    const contractId = `${contractType}_${contractNumberStr}`;
    const now = new Date().toISOString();

    const destinationKey =
      `public/contracts/${contractType}/${contractNumberStr}.pdf`;

    console.log("Processing:", {
      contractId,
      sourceKey,
      destinationKey,
    });

    // --------------------
    // FETCH EXISTING ITEM
    // --------------------
    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: contractId },
      })
    );

    // =========================================================
    // 🔒 LOCKED CONTRACT → ONLY MOVE TO DUPLICATES, NO DDB TOUCH
    // =========================================================
    if (existing.Item?.locked === true) {
      const lockedPath =
        `public/duplicates/${contractId}/${now}.pdf`;

      console.log("LOCKED → moving to duplicates:", lockedPath);

      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${sourceKey}`,
          Key: lockedPath,
        })
      );

      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: sourceKey,
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          locked: true,
          message: "Contract is locked — file stored as duplicate only",
          duplicatePath: lockedPath,
        }),
      };
    }

    // =========================================================
    // NORMAL FLOW (NOT LOCKED)
    // =========================================================

    // 1. move file into canonical location
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${sourceKey}`,
        Key: destinationKey,
      })
    );

    // 2. remove temp upload
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: sourceKey,
      })
    );

    let resultItem;

    // --------------------
    // CREATE
    // --------------------
    if (!existing.Item) {
      resultItem = {
        id: contractId,
        contractType,
        contractNumber: contractNumberStr,
        pdfType,
        pictureKey: destinationKey,
        signed: true,
        createdAt: now,
        updatedAt: now,
      };

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: resultItem,
        })
      );

      console.log("Created contract");
    }

    // --------------------
    // UPDATE
    // --------------------
    else {
      const duplicatePath =
        `public/duplicates/${contractId}/${Date.now()}.pdf`;

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
              duplicateKey = list_append(if_not_exists(duplicateKey, :empty), :d)
          `,
          ExpressionAttributeValues: {
            ":t": pdfType,
            ":n": contractNumberStr,
            ":s": true,
            ":u": now,
            ":d": [duplicatePath],
            ":empty": [],
          },
          ReturnValues: "ALL_NEW",
        })
      );

      resultItem = updated.Attributes;

      console.log("Updated contract");
    }

    // --------------------
    // RESPONSE
    // --------------------
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        item: resultItem,
      }),
    };
  } catch (err) {
    console.error("ERROR:", err);

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