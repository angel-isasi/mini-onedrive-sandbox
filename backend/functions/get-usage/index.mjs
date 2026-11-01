import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const QUOTA = 1024 * 1024 * 1024; // 1 GB

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  let used = 0;
  let trash = 0;
  let lastKey;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :u",
        FilterExpression: "#t = :file",
        ExpressionAttributeNames: { "#t": "type", "#s": "size" },
        ExpressionAttributeValues: { ":u": userId, ":file": "file" },
        ProjectionExpression: "#s, deletedAt", // solo traemos lo necesario
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of res.Items) {
      used += item.size || 0;
      if (item.deletedAt) trash += item.size || 0;
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return json(200, { used, trash, quota: QUOTA });
};
