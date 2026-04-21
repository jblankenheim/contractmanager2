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

exports.handler = async (event) => {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const fileKey = body?.file;

    if (!fileKey) return response(400, { message: "Missing S3 file key" });

    try {
        const csv = await loadS3(fileKey);

        const rawRows = parse(csv, { 
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
            relax_column_count: true
        });

        const contracts = new Map();
        const skippedRows = [];

        for (const raw of rawRows) {
            const row = normalizeRow(raw);

            if (!row.contractType || !row.contractNumber) {
                skippedRows.push({ name: raw.name || "Unknown", reason: "Missing Key" });
                continue;
            }

            const id = `${row.contractType}_${row.contractNumber}`;

            if (!contracts.has(id)) {
                contracts.set(id, { 
                    contractType: row.contractType,
                    contractNumber: row.contractNumber,
                    location: row.location,
                    transactions: []
                });
            }

            contracts.get(id).transactions.push(row.transaction);
        }

        if (contracts.size === 0) {
            return response(200, { message: "No valid rows found", skippedCount: skippedRows.length });
        }

        const existingItems = await batchGetContracts([...contracts.keys()]);
        const existingMap = new Map(existingItems.map((item) => [item.id, item]));

        const results = await pMap([...contracts.entries()], ([id, contract]) =>
            processContract(id, contract, existingMap.get(id))
        );

        const closedContractIds = results.filter(r => r.status === "closed").map(r => r.id);
        const processedIds = results.filter(r => r.status === "success").map(r => r.id);

        if (processedIds.length > 0) {
            try {
                await lambda.send(new InvokeCommand({
                    FunctionName: "transactionPDFGen-dev",
                    InvocationType: "Event",
                    Payload: JSON.stringify({ contractIds: processedIds }),
                }));
                console.log(`Triggered PDF Gen for ${processedIds.length} contracts`);
            } catch (err) {
                console.error("PDF Trigger failed:", err);
            }
        }

        return response(200, {
            message: `Processed ${processedIds.length} contracts.`,
            closedCount: closedContractIds.length,
            closedContractIds,
            skippedCount: skippedRows.length
        });

    } catch (error) {
        console.error("Global Error:", error);
        return response(500, { message: error.message });
    }
};

async function processContract(id, contract, existingItem) {
    if (existingItem?.closedBy || existingItem?.closedDate) {
        return { id, status: "closed" };
    }

    const now = new Date().toISOString();
    const originalQuantity = existingItem?.originalQuantity ?? 0;

    const sorted = contract.transactions
        .filter(t => t.date)
        .sort((a, b) => a.date.localeCompare(b.date));

    let currentRemaining = originalQuantity;

    const enriched = sorted.map(t => {
        currentRemaining -= t.quantity;
        return {
            date: t.date,
            quantity: t.quantity,
            remainingQuantity: currentRemaining,
            dollars: t.dollars,
            checkNumber: t.checkNumber,
            contractId: id
        };
    });

    const finalRemaining = enriched.length > 0
        ? enriched[enriched.length - 1].remainingQuantity
        : originalQuantity;

    const common = {
        transactionDates: enriched,
        remainingQuantity: finalRemaining,
        location: contract.location,
        updatedAt: now,
        needsTransactionKey: true
    };

    try {
        if (!existingItem) {
            await ddb.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    id,
                    contractType: contract.contractType,
                    contractNumber: contract.contractNumber,
                    originalQuantity,
                    createdAt: now,
                    ...common
                }
            }));
        } else {
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id },
                ConditionExpression: "attribute_not_exists(closedBy) AND attribute_not_exists(closedDate)",
                UpdateExpression: `
                    SET transactionDates = :t,
                        remainingQuantity = :r,
                        #loc = :l,
                        updatedAt = :u,
                        needsTransactionKey = :n
                `,
                ExpressionAttributeNames: { "#loc": "location" },
                ExpressionAttributeValues: {
                    ":t": common.transactionDates,
                    ":r": common.remainingQuantity,
                    ":l": common.location,
                    ":u": now,
                    ":n": true
                }
            }));
        }

        return { id, status: "success" };

    } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
            return { id, status: "closed" };
        }
        throw err;
    }
}
function normalizeCheckNumber(v) {
    if (v === undefined || v === null) return null;

    // Convert to string and trim whitespace
    let clean = String(v).trim();

    // Remove BOM if present
    clean = clean.replace(/^\uFEFF/, "");

    // If the result is empty, treat as null
    return clean.length > 0 ? clean : null;
}
function normalizeRow(row) {
    return {
        contractType: row.contractType?.trim() || null,
        contractNumber: (row.contractNumber || row.conractNumber)?.trim() || null,
        location: row.location?.trim() || null,
        transaction: {
            date: normalizeDate(row.date),
            quantity: toNumber(row.quantity),
            dollars: toNumber(row.netDollars),
            checkNumber: normalizeCheckNumber(row.checkNumber)
        }
    };
}

async function loadS3(key) {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await obj.Body.transformToString();
    return text.replace(/^\uFEFF/, ""); // Remove BOM
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

/* ============================================================
   BATCH GET + PARALLEL MAP
============================================================ */
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

async function pMap(items, fn, { concurrency = 25 } = {}) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const i = index++;
            results[i] = await fn(items[i], i);
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, worker)
    );

    return results;
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: { 
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*" 
        },
        body: JSON.stringify(body)
    };
}
