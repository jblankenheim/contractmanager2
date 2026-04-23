import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const lambdaClient = new LambdaClient({});

export const handler = async (event) => {
    const contractID = event.contractID;

    if (!contractID) {
        return { statusCode: 400, body: JSON.stringify({ message: "Missing contractID" }) };
    }

    try {
        // 1. Fetch the Contract
        const getParams = {
            TableName: "ContractsTable",
            Key: { id: contractID },
        };
        const { Item: contract } = await docClient.send(new GetCommand(getParams));

        if (!contract) {
            return { statusCode: 404, body: JSON.stringify({ message: "Contract not found" }) };
        }

        // 2. Initialize calculation
        let runningBalance = Number(contract.originalQuantity || 0);
        const transactions = contract.transactionDates || [];

        // 3. Recalculate each transaction
        // Optional: transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        const updatedTransactions = transactions.map((tx) => {
            const txQty = Number(tx.quantity || 0);
            runningBalance -= txQty;
            
            return {
                ...tx,
                remainingBushels: runningBalance
            };
        });

        // 4. Update the Contract in DynamoDB
        const updateParams = {
            TableName: "ContractsTable",
            Key: { id: contractID },
            UpdateExpression: "SET transactionDates = :t, remainingQuantity = :r",
            ExpressionAttributeValues: {
                ":t": updatedTransactions,
                ":r": runningBalance,
            },
        };
        await docClient.send(new UpdateCommand(updateParams));

        // 5. Trigger transactionPDFGen lambda asynchronously
        const invokeParams = {
            FunctionName: "transactionPDFGen",
            InvocationType: "Event", // Async trigger
            Payload: JSON.stringify({ contractID }),
        };
        await lambdaClient.send(new InvokeCommand(invokeParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Recalculation and update complete",
                remainingQuantity: runningBalance,
            }),
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};

