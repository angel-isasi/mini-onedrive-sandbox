import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const LIMIT = 20;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  // Todos los archivos (no carpetas) no borrados del usuario
  const items = [];
  let lastKey;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :u",
        FilterExpression: "#t = :file AND attribute_not_exists(deletedAt)",
        ExpressionAttributeNames: { "#t": "type" },
        ExpressionAttributeValues: { ":u": userId, ":file": "file" },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  // Más recientes primero
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return json(
    200,
    items.slice(0, LIMIT).map((i) => ({
      id: i.itemId,
      name: i.name,
      type: i.type,
      size: i.size,
      parentId: i.parentId,
      updatedAt: i.updatedAt,
    })),
  );
};
