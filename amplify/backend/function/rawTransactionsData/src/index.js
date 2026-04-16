/* Amplify Params - DO NOT EDIT ... */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const fileKey = body.file;

    if (!fileKey) return response(400, 'Missing S3 file path');

    const csvData = await loadCsv(fileKey);
    const records = parseCsv(csvData);
    
    const grouped = groupByContract(records);

    for (const contractId of Object.keys(grouped)) {
      await updateContractTransactions(contractId, grouped[contractId]);
    }

    return response(200, 'Transaction dates and remaining quantity updated');
  } catch (err) {
    console.error(err);
    return response(500, err.message);
  }
};

async function loadCsv(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const obj = await s3Client.send(command);
  const str = await obj.Body.transformToString();
  return str.replace(/^\uFEFF/, ''); // Strip wingdings/BOM
}

function parseCsv(csv) {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return [];

  // Quote-aware parser
  const parseLine = (line) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      let char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else cur += char;
    }
    result.push(cur.trim());
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const headers = parseLine(lines.shift());

  return lines.map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      if (h) row[h] = values[i];
    });
    return row;
  });
}

function groupByContract(rows) {
  const grouped = {};
  rows.forEach(row => {
    const id = `${row.contractType}_${row.contractNumber}`;
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push(row);
  });
  return grouped;
}

async function updateContractTransactions(contractId, rows) {
  const result = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: contractId }
  }));

  const contract = result.Item;
  if (!contract) return;

  // Skip if closed (added closedBy check as well per your requirement)
  if (contract.closedDate || contract.closedBy) return;

  let transactionDates = contract.transactionDates || [];
  const incomingDates = new Set(rows.map(r => r.date));

  // Remove old entries for these dates
  transactionDates = transactionDates.filter(t => !incomingDates.has(t.date));

  // Add new entries
  const newEntries = rows.map(r => ({
    date: r.date,
    quantity: Number((r.quantity || "0").replace(/[^0-9.-]+/g, "")),
    checkNumber: r.checkNumber || '',
  }));

  transactionDates = [...transactionDates, ...newEntries].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate running balance
  let currentBalance = Number(contract.originalQuantity || 0);
  transactionDates = transactionDates.map(t => {
    currentBalance -= t.quantity;
    return { ...t, remainingQuantity: currentBalance };
  });

  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: contractId },
    UpdateExpression: `SET transactionDates = :td, remainingQuantity = :rq, markforReview = :mfr`,
    ExpressionAttributeValues: {
      ':td': transactionDates,
      ':rq': currentBalance,
      ':mfr': currentBalance < 5
    }
  }));
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    body: JSON.stringify({ message: body })
  };
}