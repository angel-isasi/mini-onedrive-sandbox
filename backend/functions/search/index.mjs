import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const LIMIT = 50;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  const q = (event.queryStringParameters?.q || "").trim().toLowerCase();
  if (q.length < 2)
    return json(400, { message: "Escribe al menos 2 caracteres" });

  // Traemos los items no borrados del usuario
  const items = [];
  let lastKey;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :u",
        FilterExpression: "attribute_not_exists(deletedAt)",
        ExpressionAttributeValues: { ":u": userId },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  // DynamoDB "contains" distingue mayúsculas, por eso filtramos en código
  const results = items
    .filter((i) => i.name?.toLowerCase().includes(q))
    .sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type === "folder"
          ? -1
          : 1,
    )
    .slice(0, LIMIT)
    .map((i) => ({
      id: i.itemId,
      name: i.name,
      type: i.type,
      size: i.size ?? null,
      parentId: i.parentId,
      updatedAt: i.updatedAt,
    }));

  return json(200, results);
};
