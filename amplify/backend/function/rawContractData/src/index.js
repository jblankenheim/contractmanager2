const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { parse } = require("csv-parse/sync");

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

// Removed contractDue from here so it is no longer mandatory
const REQUIRED_FIELDS = [
  "contractType",
  "contractNumber",
  "name",
  "location",
  "contractDate",
  "originalQuantity",
  "remainingQuantity"
];

// --- HELPERS ---
async function loadS3File(key) {
  console.log(`[S3] Fetching: ${key}`);
  const res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.Body.transformToString();
}

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
  return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
}

function parseCsvNumber(value, fieldName, errors) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (cleaned === "") {
    errors.push(`Missing number: ${fieldName}`);
    return 0;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) {
    errors.push(`Invalid number for ${fieldName}: ${value}`);
    return 0;
  }
  return n;
}

async function upsertContract(row) {
  const id = `${row.contractType}_${row.contractNumber}`;
  const now = new Date().toISOString();
  try {
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `
        SET contractType = :ct, 
            contractNumber = :cn, 
            #name = :n, 
            #loc = :l, 
            contractDate = :cd, 
            originalQuantity = :oq, 
            remainingQuantity = :rq, 
            contractDue = :cDue, 
            updatedAt = :u, 
            createdAt = if_not_exists(createdAt, :u)
      `,
      ExpressionAttributeNames: { "#name": "name", "#loc": "location" },
      ExpressionAttributeValues: {
        ":ct": row.contractType,
        ":cn": row.contractNumber,
        ":n": row.name,
        ":l": row.location,
        ":cd": row.contractDate,
        ":oq": row.originalQuantity,
        ":rq": row.remainingQuantity,
        ":cDue": row.contractDue, // This will be the normalized string or null
        ":u": now
      },
    }));
    return { id, status: "updated" };
  } catch (err) {
    console.error(`[DDB Error] ${id}:`, err.message);
    return { id, status: "error", error: err.message };
  }
}

// --- HANDLER ---
exports.handler = async (event) => {
  console.log("--- Execution Started ---");
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const fileKey = body.file;

    if (!fileKey) return { statusCode: 400, body: JSON.stringify({ error: "Missing file" }) };

    const csvText = await loadS3File(fileKey);
    const rawRows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    const rows = rawRows.map(row => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().replace(/\s+/g, '');
        const camelKey = cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1);
        cleanRow[camelKey] = row[key];
      });
      return cleanRow;
    });

    const validRows = [];
    const invalidRows = [];

    for (const [index, rawRow] of rows.entries()) {
      const errors = [];

      // Validate mandatory fields
      REQUIRED_FIELDS.forEach(f => {
        if (!rawRow[f] || String(rawRow[f]).trim() === "") errors.push(`Missing ${f}`);
      });

      const contractDate = normalizeAWSDate(rawRow.contractDate);
      if (!contractDate) errors.push(`Bad Date: ${rawRow.contractDate}`);

      // Handle optional contractDue
      let contractDue = null;
      if (rawRow.contractDue && String(rawRow.contractDue).trim() !== "") {
        contractDue = normalizeAWSDate(rawRow.contractDue);
        if (!contractDue) {
          errors.push(`Invalid optional date format for contractDue: ${rawRow.contractDue}`);
        }
      }

      if (errors.length > 0) {
        invalidRows.push({ row: index + 2, errors });
      } else {
        validRows.push({
          ...rawRow,
          contractDate,
          contractDue,
          originalQuantity: parseCsvNumber(rawRow.originalQuantity, "oq", errors),
          remainingQuantity: parseCsvNumber(rawRow.remainingQuantity, "rq", errors)
        });
      }
    }

    if (validRows.length > 0) {
      for (let i = 0; i < validRows.length; i += 5) {
        const batch = validRows.slice(i, i + 5);
        await Promise.all(batch.map(upsertContract));
      }
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({
        total: rows.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        sampleErrors: invalidRows.slice(0, 3)
      })
    };
  } catch (err) {
    console.error("FATAL ERROR:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};