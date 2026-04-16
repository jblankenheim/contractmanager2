/* Amplify Params - DO NOT EDIT ... */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

// Updated to include all fields you mentioned
const ALLOWED_FIELDS = [
  'contractType', 'contractNumber', 'commodity', 'name', 
  'location', 'contractDate', 'originalQuantity', 'remainingQuantity', 
  'netDollars'
];

let validationErrors = [];
let closedContracts = new Set();

exports.handler = async (event) => {
  validationErrors = [];
  closedContracts = new Set();

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    let fileKey = body.file;

    if (!fileKey) return response(400, { message: 'No S3 file path provided' });

    const csvData = await loadS3File(fileKey);
    const rows = parseCsv(csvData);
    
    if (rows.length === 0) {
        return response(400, { message: "CSV file appears empty or formatted incorrectly." });
    }

    for (const row of rows) {
      await upsertContract(row, fileKey);
    }

    return response(200, {
      message: `Successfully processed ${rows.length} rows.`,
      closedContracts: Array.from(closedContracts),
      errors: validationErrors.length > 0 ? validationErrors : undefined
    });

  } catch (err) {
    console.error('TOP LEVEL ERROR:', err);
    return response(500, { message: 'Internal server error', error: err.message });
  }
};

async function loadS3File(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const obj = await s3Client.send(command);
  let str = await obj.Body.transformToString();
  
  // Clean up "Wingdings"/BOM (Byte Order Mark) at the start of the file
  return str.replace(/^\uFEFF/, '');
}

function parseCsv(data) {
  // Handle different line endings and filter out empty lines
  const lines = data.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return [];

  // Get headers from the first row and trim whitespace/invisible chars
  const headers = lines.shift().split(',').map(h => h.trim().replace(/['"]+/g, ''));
  console.log('Dynamic Headers Mapping:', headers);

  return lines.map((line, index) => {
    // Simple split by comma. Note: If your data has commas inside quotes, we'll need a regex split.
    const values = line.split(',').map(v => v.trim().replace(/['"]+/g, ''));
    const obj = { __rowNumber: index + 2 };

    headers.forEach((header, i) => {
      // Map every value to its corresponding header name
      if (header && values[i] !== undefined) {
        obj[header] = values[i];
      }
    });
    return obj;
  });
}

async function upsertContract(row, fileKey) {
  const { contractType, contractNumber } = row;

  if (!contractType || !contractNumber) {
    validationErrors.push({ row: row.__rowNumber, error: 'Missing contractType or contractNumber' });
    return;
  }

  const id = `${contractType}_${contractNumber}`;
  
  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id }
  }));

  if (existing.Item?.closedDate || existing.Item?.closedBy) {
    closedContracts.add(id);
    return;
  }

  if (existing.Item) {
    await updateContract(id, row);
  } else {
    await createContract(id, row);
  }
}

async function createContract(id, row) {
  const item = { id };
  ALLOWED_FIELDS.forEach(field => {
    if (row[field] !== undefined && row[field] !== '') {
      item[field] = castValue(field, row[field]);
    }
  });
  
  await dynamodb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

async function updateContract(id, row) {
  let updateExp = 'SET ';
  const attrNames = {};
  const attrValues = {};
  let hasUpdates = false;

  ALLOWED_FIELDS.forEach(field => {
    if (row[field] !== undefined && row[field] !== '') {
      updateExp += `#${field} = :${field}, `;
      attrNames[`#${field}`] = field;
      attrValues[`:${field}`] = castValue(field, row[field]);
      hasUpdates = true;
    }
  });

  if (!hasUpdates) return;
  updateExp = updateExp.slice(0, -2);

  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id },
    UpdateExpression: updateExp,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues
  }));
}

function castValue(field, value) {
  // Convert these specific fields to numbers for DynamoDB
  if (['originalQuantity', 'remainingQuantity', 'netDollars'].includes(field)) {
    const num = Number(value.replace(/[^0-9.-]+/g, "")); // Strip currency symbols or commas
    return isNaN(num) ? 0 : num;
  }
  return value;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    body: JSON.stringify(body)
  };
}