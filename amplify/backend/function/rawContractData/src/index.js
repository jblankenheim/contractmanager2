const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const lambda = new LambdaClient({});
const {
  DynamoDBDocumentClient,
  UpdateCommand,
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


function parseCsvNumber(value, fieldName, errors) {
  if (value === undefined || value === null) {
    errors.push(`Missing ${fieldName}`);
    return null;
  }

  const cleaned = String(value).replace(/,/g, "").trim();
  const n = Number(cleaned);

  if (!Number.isFinite(n)) {
    errors.push(`Invalid number for ${fieldName}: ${value}`);
    return null;
  }

  return n;
}


// ======================
// ✅ BATCH PROCESSOR (KEY TO PERFORMANCE)
// ======================
async function processInBatches(items, batchSize = 5) {
  let results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(upsertContract));
    results = results.concat(batchResults);
  }
  return results;
}

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const fileKey = body.file;

    if (!fileKey) {
      return response(400, { error: "Missing file key" });
    }

    // 1. Load and parse the CSV
    const csvText = await loadS3File(fileKey);
    const rows = parseCsv(csvText);

    const validRows = [];
    const invalidRows = [];

    // 2. Validate the rows and fill validRows array
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

    // 3. NOW call the batch processor with the filled validRows
    const results = await processInBatches(validRows, 5);

    // 4. Calculate the counts for the response
    const updatedIds = results.filter(r => r.status === "updated").map(r => r.id);
    const closedIds = results.filter(r => r.status === "closed").map(r => r.id);

    return response(200, {
      processed: rows.length,
      valid: validRows.length,
      updatedCount: updatedIds.length,
      closedCount: closedIds.length,
      closedContractIds: closedIds,
      invalidRows,
    });

  } catch (err) {
    console.error(err);
    return response(500, { error: err.message });
  }
};


// ======================
async function loadS3File(key) {
  const res = await s3Client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  return res.Body.transformToString();
}


// ======================
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



function validateAndCleanRow(rawRow) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const value = rawRow[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors.push(`Missing ${field}`);
    }
  }

  const contractDate = normalizeAWSDate(rawRow.contractDate);
  if (!contractDate) errors.push("Invalid contractDate format");

  const originalQuantity = parseCsvNumber(
    rawRow.originalQuantity,
    "originalQuantity",
    errors
  );

  const remainingQuantity = parseCsvNumber(
    rawRow.remainingQuantity,
    "remainingQuantity",
    errors
  );

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    cleanRow: {
      contractType: rawRow.contractType,
      contractNumber: rawRow.contractNumber,
      name: rawRow.name,
      location: rawRow.location,
      contractDate,
      originalQuantity,
      remainingQuantity,
      commodity: rawRow.commodity?.trim() || null   
    },
  };
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
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return null;
}



async function upsertContract(row) {
  const id = `${row.contractType}_${row.contractNumber}`;
  const now = new Date().toISOString();

  try {
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
       
        ConditionExpression: "attribute_not_exists(closedBy) AND attribute_not_exists(closedDate)",
        UpdateExpression: `
  SET contractType = :contractType,
      contractNumber = :contractNumber,
      #name = :name,
      #location = :location,
      contractDate = :contractDate,
      originalQuantity = :originalQuantity,
      remainingQuantity = :remainingQuantity,
      commodity = :commodity,        
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
          ":commodity": row.commodity,
          ":updatedAt": now,
          ":createdAt": now,
        },
      })
    );
    return { id, status: "updated" };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {

      return { id, status: "closed" };
    }
    throw err; 
  }
}


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
