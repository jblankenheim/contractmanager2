/* Amplify Params - DO NOT EDIT ... */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

const ALLOWED_FIELDS = [
  'contractType', 'contractNumber', 'name', 'location', 
  'originalQuantity', 'remainingQuantity', 'netDollars'
];

let validationErrors = [];
let closedContracts = new Set();

exports.handler = async (event) => {
  console.log('EVENT received');
  validationErrors = [];
  closedContracts = new Set();

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // The frontend sends the path like "public/bulk/contracts/file.csv"
    // S3 GetObject needs the key exactly as it exists in the bucket.
    let fileKey = body.file;

    if (!fileKey) return response(400, { message: 'No S3 file path provided' });

    console.log(`Attempting to fetch from S3: Bucket: ${BUCKET}, Key: ${fileKey}`);

    const csvData = await loadS3File(fileKey);
    const rows = parseCsv(csvData);
    
    console.log(`Parsed ${rows.length} rows from CSV.`);

    for (const row of rows) {
      await upsertContract(row, fileKey);
    }

    console.log('Processing complete.');

    return response(200, {
      message: `Processed ${rows.length} rows.`,
      closedContracts: Array.from(closedContracts),
      errors: validationErrors.length > 0 ? validationErrors : undefined
    });

  } catch (err) {
    console.error('TOP LEVEL ERROR:', err);
    return response(500, { message: 'Internal server error', error: err.message });
  }
};

async function loadS3File(key) {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const obj = await s3Client.send(command);
    return await obj.Body.transformToString();
  } catch (err) {
    console.error(`S3 Error loading ${key}:`, err.message);
    throw new Error(`Could not retrieve file from S3: ${err.message}`);
  }
}

function parseCsv(data) {
  const lines = data.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines.shift().split(',').map(h => h.trim());
  console.log('Detected Headers:', headers);

  return lines.map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    const obj = { __rowNumber: index + 2 };
    headers.forEach((header, i) => {
      if (values[i] !== undefined) obj[header] = values[i];
    });
    return obj;
  });
}

async function upsertContract(row, fileKey) {
  const { contractType, contractNumber } = row;

  if (!contractType || !contractNumber) {
    console.warn(`Row ${row.__rowNumber}: Missing ID info`, row);
    validationErrors.push({ row: row.__rowNumber, error: 'Missing contractType or contractNumber' });
    return;
  }

  const id = `${contractType}_${contractNumber}`;
  
  // 1. Check existing
  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id }
  }));

  if (existing.Item?.closedDate || existing.Item?.closedBy) {
    console.log(`Skipping ${id}: Contract is closed.`);
    closedContracts.add(id);
    return;
  }

  if (existing.Item) {
    console.log(`Updating existing contract: ${id}`);
    await updateContract(id, row);
  } else {
    console.log(`Creating new contract: ${id}`);
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
    // Only update if the field is in the CSV and not empty
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
  if (['originalQuantity', 'remainingQuantity', 'netDollars'].includes(field)) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
  return value;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 
      'Access-Control-Allow-Origin': '*', 
      'Access-Control-Allow-Headers': '*' 
    },
    body: JSON.stringify(body)
  };
}
