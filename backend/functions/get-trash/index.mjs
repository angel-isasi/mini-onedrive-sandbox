import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  const items = [];
  let lastKey;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :u",
        FilterExpression: "attribute_exists(deletedAt)",
        ExpressionAttributeValues: { ":u": userId },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  return json(
    200,
    items.map((i) => ({
      id: i.itemId,
      name: i.name,
      type: i.type,
      size: i.size ?? null,
      parentId: i.parentId,
      deletedAt: i.deletedAt,
    })),
  );
};
