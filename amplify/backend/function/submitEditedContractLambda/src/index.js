const AWS = require("aws-sdk");

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.CONTRACT_TABLE;
const BUCKET = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event, null, 2));

  const { pictureKey, contractType, contractNumber, pdfType } =
    JSON.parse(event.body || event);

  // 🚨 enforce uploads only
  if (!pictureKey || !pictureKey.startsWith("uploads/")) {
    return {
      statusCode: 400,
      body: "Invalid file path. Must start with uploads/"
    };
  }

  const contractId = `${contractType}_${contractNumber}`;

  const existing = await dynamodb.get({
    TableName: TABLE_NAME,
    Key: { id: contractId }
  }).promise();

  let contract = existing.Item;

  const moveFile = async (oldKey, newKey) => {
    await s3.copyObject({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${oldKey}`,
      Key: newKey
    }).promise();

    await s3.deleteObject({
      Bucket: BUCKET,
      Key: oldKey
    }).promise();

    return newKey;
  };

  const basePath = `contracts/${contractType}/${contractNumber}`;

  // =====================================================
  // NEW CONTRACT
  // =====================================================
  if (!contract) {
    let finalKey = pictureKey;

    if (pdfType === "contract") {
      finalKey = await moveFile(
        pictureKey,
        `${basePath}/${Date.now()}.pdf`
      );
    }

    contract = {
      id: contractId,
      contractType,
      contractNumber,
      pictureKey: finalKey,
      contractDollars: 0,
      contractBushels: "0",
      remainingBushels: 0,
      remainingDollars: 0
    };

    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: contract
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(contract)
    };
  }

  // =====================================================
  // EXISTING CONTRACT
  // =====================================================
  if (pdfType === "contract") {

    if (!contract.pictureKey) {
      const newKey = await moveFile(
        pictureKey,
        `${basePath}/${Date.now()}.pdf`
      );

      await dynamodb.update({
        TableName: TABLE_NAME,
        Key: { id: contractId },
        UpdateExpression: "SET pictureKey = :p",
        ExpressionAttributeValues: {
          ":p": newKey
        }
      }).promise();

      return { statusCode: 200, body: "Updated pictureKey" };
    }

    const dupKey = await moveFile(
      pictureKey,
      `unassigned/${contractType}/${contractNumber}/${Date.now()}.pdf`
    );

    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { id: contractId },
      UpdateExpression: "SET duplicateKey = :d",
      ExpressionAttributeValues: {
        ":d": dupKey
      }
    }).promise();

    return { statusCode: 200, body: "Duplicate stored" };
  }

  // =====================================================
  // ADDENDUM
  // =====================================================
  if (pdfType === "addendum") {

    let targetKey;
    let field;

    if (!contract.addendumKey1) {
      targetKey = `${basePath}/addendum_1/${Date.now()}.pdf`;
      field = "addendumKey1";
    } else if (!contract.addendumKey2) {
      targetKey = `${basePath}/addendum_2/${Date.now()}.pdf`;
      field = "addendumKey2";
    } else {
      return {
        statusCode: 400,
        body: "Both addendum slots full"
      };
    }

    const newKey = await moveFile(pictureKey, targetKey);

    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { id: contractId },
      UpdateExpression: `SET ${field} = :v`,
      ExpressionAttributeValues: {
        ":v": newKey
      }
    }).promise();

    return {
      statusCode: 200,
      body: `Saved ${field}`
    };
  }

  return {
    statusCode: 400,
    body: "Invalid pdfType"
  };
};