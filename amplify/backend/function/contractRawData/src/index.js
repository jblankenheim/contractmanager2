/* Amplify Params - DO NOT EDIT
	API_CONTRACTMANAGER2_CONTRACTTABLE_ARN
	API_CONTRACTMANAGER2_CONTRACTTABLE_NAME
	API_CONTRACTMANAGER2_GRAPHQLAPIENDPOINTOUTPUT
	API_CONTRACTMANAGER2_GRAPHQLAPIIDOUTPUT
	API_CONTRACTMANAGER2_GRAPHQLAPIKEYOUTPUT
	API_CONTRACTMANAGER2_TRANSACTIONDATETABLE_ARN
	API_CONTRACTMANAGER2_TRANSACTIONDATETABLE_NAME
	API_CONTRACTSAPI_APIID
	API_CONTRACTSAPI_APINAME
	AUTH_CONTRACTMANAGER2_USERPOOLID
	ENV
	REGION
	STORAGE_S3CONTRACTMANAGER2STORAGE87F59124_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    return {
        statusCode: 200,
    //  Uncomment below to enable CORS requests
    //  headers: {
    //      "Access-Control-Allow-Origin": "*",
    //      "Access-Control-Allow-Headers": "*"
    //  },
        body: JSON.stringify('Hello from Lambda!'),
    };
};
