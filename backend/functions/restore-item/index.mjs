import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : "",
});

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  const id = event.pathParameters?.id;
  if (!id) return json(400, { message: "Falta id" });

  const { Item } = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, itemId: id },
    }),
  );
  if (!Item || !Item.deletedAt)
    return json(404, { message: "No está en la papelera" });

  // Si la carpeta padre ya no existe o también está en la papelera, se restaura en la raíz
  let parentId = Item.parentId;
  if (parentId !== "root") {
    const { Item: parent } = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId, itemId: parentId },
      }),
    );
    if (!parent || parent.deletedAt) parentId = "root";
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, itemId: id },
      UpdateExpression: "REMOVE deletedAt SET parentId = :p, updatedAt = :now",
      ExpressionAttributeValues: {
        ":p": parentId,
        ":now": new Date().toISOString(),
      },
    }),
  );

  return json(200, { id, parentId });
};
