const { parse } = require("csv-parse/sync");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, BatchGetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const lambda = new LambdaClient({});

const TABLE_NAME = process.env.API_CONTRACTMANAGER2_CONTRACTTABLE_NAME;
const BUCKET = process.env.STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME;

/* ========================= ENTRY POINT ========================= */
exports.handler = async (event) => {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const fileKey = body.file;

    if (!fileKey) return response(400, { message: "Missing S3 file key" });

    const csv = await loadS3(fileKey);
    
    // Updated parser options to handle messy quoting and whitespace
    const rawRows = parse(csv, { 
        columns: true, 
        skip_empty_lines: true, 
        trim: true,
        relax_quotes: true,     // Handles quotes in middle of fields
        relax_column_count: true // Prevents crashing if commas shift columns
    });

    const contracts = new Map();
    const skippedRows = []; 

    for (const raw of rawRows) {
        const row = normalizeRow(raw);

        // STOPS THE CRASH: Skips row if data shifted and keys are missing
        if (!row.contractType || !row.contractNumber) {
            skippedRows.push({
                name: raw.name || "Unknown", 
                type: row.contractType,
                number: row.contractNumber,
                reason: "Missing Key (Likely due to unquoted comma shift)"
            });
            continue;
        }

        const id = `${row.contractType}_${row.contractNumber}`;
        if (!contracts.has(id)) {
            contracts.set(id, {
                contractType: row.contractType,
                contractNumber: row.contractNumber,
                location: row.location,
                transactions: [],
            });
        }
        contracts.get(id).transactions.push(row.transaction);
    }

    if (contracts.size === 0) {
        return response(200, { message: "No valid rows found", skippedCount: skippedRows.length, skippedRows });
    }

    const existingItems = await batchGetContracts([...contracts.keys()]);
    const existingMap = new Map(existingItems.map((item) => [item.id, item]));

    await pMap([...contracts.entries()], ([id, contract]) => processContract(id, contract, existingMap.get(id)));

    try {
        await lambda.send(new InvokeCommand({
            FunctionName: "transactionPDFGen-dev",
            InvocationType: "Event",
            Payload: JSON.stringify({ contractIds: [...contracts.keys()] }),
        }));
    } catch (err) {
        console.error("PDF Trigger failed:", err);
    }

    return response(200, {
        message: `Processed ${contracts.size} contracts.`,
        skippedCount: skippedRows.length,
        skippedRows 
    });
};

/* ========================= NORMALIZE ========================= */
function normalizeRow(row) {
    return {
        // Fallback to null so our truthy check catches empty strings
        contractType: row.contractType?.trim() || null,
        contractNumber: (row.contractNumber || row.conractNumber)?.trim() || null,
        location: row.location,
        transaction: {
            date: normalizeDate(row.date),
            quantity: toNumber(row.quantity),
            dollars: toNumber(row.netDollars),
            checkNumber: row.checkNumber,
        },
    };
}

/* ========================= HELPERS ========================= */
async function loadS3(key) {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await obj.Body.transformToString();
    return text.replace(/^\uFEFF/, ""); // Removes BOM if present
}

function normalizeDate(v) {
    if (!v) return null;
    const clean = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parts = clean.split("/");
    if (parts.length === 3) {
        const [m, d, y] = parts;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return null;
}

function toNumber(val) {
    if (!val) return 0;
    const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
}

async function batchGetContracts(ids) {
    if (!ids.length) return [];
    const results = [];
    for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const result = await ddb.send(new BatchGetCommand({ 
            RequestItems: { [TABLE_NAME]: { Keys: chunk.map(id => ({ id })) } } 
        }));
        results.push(...(result.Responses?.[TABLE_NAME] ?? []));
    }
    return results;
}

async function processContract(id, contract, existingItem) {
    const originalQuantity = existingItem?.originalQuantity ?? 0;
    const now = new Date().toISOString();
    const sorted = contract.transactions.filter(t => t.date).sort((a, b) => a.date.localeCompare(b.date));

    let remaining = originalQuantity;
    const enriched = sorted.map(t => {
        remaining -= t.quantity;
        return { ...t, remainingQuantity: remaining, contractId: id };
    });

    const finalRemaining = enriched.length > 0 ? enriched[enriched.length - 1].remainingQuantity : originalQuantity;

    const common = {
        transactionDates: enriched,
        remainingQuantity: finalRemaining,
        location: contract.location,
        updatedAt: now,
        needsTransactionKey: true 
    };

    if (!existingItem) {
        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { id, contractType: contract.contractType, contractNumber: contract.contractNumber, originalQuantity, createdAt: now, ...common },
        }));
    } else {
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: `SET transactionDates = :t, remainingQuantity = :r, #loc = :l, updatedAt = :u, needsTransactionKey = :n`,
            ExpressionAttributeNames: { "#loc": "location" },
            ExpressionAttributeValues: { ":t": common.transactionDates, ":r": common.remainingQuantity, ":l": common.location, ":u": common.updatedAt, ":n": true },
        }));
    }
}

async function pMap(items, fn, { concurrency = 25 } = {}) {
    const results = [];
    let index = 0;
    async function worker() {
        while (index < items.length) {
            const i = index++;
            results[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
}

function response(statusCode, body) {
    return { statusCode, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }, body: JSON.stringify(body) };
}
