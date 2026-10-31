import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE = process.env.TABLE_NAME;
const USER_ID = "test-user"; // se reemplaza por Cognito en módulo 8

export const handler = async (event) => {
  const folderId = event.queryStringParameters?.folderId ?? "root";

  const result = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "userId = :u",
      FilterExpression: "parentId = :p AND attribute_not_exists(deletedAt)",
      ExpressionAttributeValues: {
        ":u": USER_ID,
        ":p": folderId,
      },
    }),
  );

  const items = (result.Items ?? []).map((item) => ({
    id: item.itemId,
    name: item.name,
    type: item.type,
    size: item.size,
    contentType: item.contentType,
    updatedAt: item.updatedAt,
  }));

  return response(200, items);
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
