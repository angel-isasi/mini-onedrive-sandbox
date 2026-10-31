import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  // userId real: el "sub" del token, ya verificado por API Gateway (JWT authorizer)
  const USER_ID = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!USER_ID) return response(401, { message: "No autorizado" });

  const folderId = event.queryStringParameters?.folderId || "root";

  // Query al GSI: solo lee los items de esta carpeta
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "byParent",
      KeyConditionExpression: "userId = :u AND parentId = :p",
      FilterExpression: "attribute_not_exists(deletedAt)",
      ExpressionAttributeValues: { ":u": USER_ID, ":p": folderId },
    }),
  );

  const items = Items.map((item) => ({
    id: item.itemId,
    name: item.name,
    type: item.type,
    size: item.size,
    contentType: item.contentType,
    updatedAt: item.updatedAt,
  }))
    // Carpetas primero, luego por nombre
    .sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type === "folder"
          ? -1
          : 1,
    );

  return response(200, items);
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
