const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const { parse } = require("csv-parse/sync");

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

const REQUIRED_FIELDS = [
  "contractType",
  "contractNumber",
  "name",
  "location",
  "contractDate",
  "originalQuantity",
  "remainingQuantity",
];

// ----------------------
exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    const fileKey = body.file;
    if (!fileKey) {
      return response(400, { error: "Missing file key" });
    }

    const csvText = await loadS3File(fileKey);
    const rows = parseCsv(csvText);

    const validRows = [];
    const invalidRows = [];

    // ----------------------
    // VALIDATION + CLEANING STAGE
    // ----------------------
    for (const rawRow of rows) {
      const validation = validateAndCleanRow(rawRow);

      if (!validation.ok) {
        invalidRows.push({
          row: rawRow.__rowNumber,
          errors: validation.errors,
        });
      } else {
        validRows.push(validation.cleanRow);
      }
    }

    // ----------------------
    // DYNAMO ONLY CLEAN DATA
    // ----------------------
    for (const cleanRow of validRows) {
      await upsertContract(cleanRow);
    }

    return response(200, {
      processed: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      invalidRows,
    });
  } catch (err) {
    console.error(err);
    return response(500, { error: err.message });
  }
};

// ----------------------
async function loadS3File(key) {
  const res = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  return res.Body.transformToString();
}

// ----------------------
function parseCsv(data) {
  return parse(data, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }).map((r, i) => ({
    ...r,
    __rowNumber: i + 2,
  }));
}

// ----------------------
// VALIDATE + TRANSFORM (single source of truth)
// ----------------------
function validateAndCleanRow(rawRow) {
  const errors = [];

  // required field check
  for (const field of REQUIRED_FIELDS) {
    const value = rawRow[field];

    if (value === undefined || value === null || String(value).trim() === "") {
      errors.push(`Missing ${field}`);
    }
  }

  const contractDate = normalizeAWSDate(rawRow.contractDate);

  if (!contractDate) {
    errors.push("Invalid contractDate format");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // ----------------------
  // CLEAN OBJECT (THIS IS WHAT WE USE GOING FORWARD)
  // ----------------------
  const cleanRow = {
    contractType: rawRow.contractType,
    contractNumber: rawRow.contractNumber,
    name: rawRow.name,
    location: rawRow.location,
    contractDate,
    originalQuantity: Number(rawRow.originalQuantity),
    remainingQuantity: Number(rawRow.remainingQuantity),
  };

  return { ok: true, cleanRow };
}

// ----------------------
function normalizeAWSDate(value) {
  if (!value) return null;

  const v = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const parts = v.split("/");

  if (parts.length === 3) {
    let [month, day, year] = parts;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return null;
}

// ----------------------
async function upsertContract(row) {
  const id = `${row.contractType}_${row.contractNumber}`;
  const now = new Date().toISOString();

  try {
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        // Check that closedDate and closedBy both DO NOT exist
        ConditionExpression: "attribute_not_exists(closedDate) AND attribute_not_exists(closedBy)",
        UpdateExpression: `
          SET contractType = :contractType,
              contractNumber = :contractNumber,
              #name = :name,
              #location = :location,
              contractDate = :contractDate,
              originalQuantity = :originalQuantity,
              remainingQuantity = :remainingQuantity,
              updatedAt = :updatedAt,
              createdAt = if_not_exists(createdAt, :createdAt)
        `,
        ExpressionAttributeNames: {
          "#name": "name",
          "#location": "location",
        },
        ExpressionAttributeValues: {
          ":contractType": row.contractType,
          ":contractNumber": row.contractNumber,
          ":name": row.name,
          ":location": row.location,
          ":contractDate": row.contractDate,
          ":originalQuantity": row.originalQuantity,
          ":remainingQuantity": row.remainingQuantity,
          ":updatedAt": now,
          ":createdAt": now,
        },
      })
    );
  } catch (err) {
    // If the condition fails, it throws a ConditionalCheckFailedException
    if (err.name === "ConditionalCheckFailedException") {
      console.log(`Skipping update for closed contract: ${id}`);
      return; // Simply skip this row and continue with the batch
    }
    throw err; // Re-throw real errors
  }
}

// ----------------------
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(body),
  };
}