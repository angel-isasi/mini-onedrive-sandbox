import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const { TABLE_NAME, BUCKET_NAME } = process.env;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : "",
});

// Hijos directos de una carpeta (incluye los que tengan deletedAt)
async function getChildren(userId, folderId) {
  const items = [];
  let lastKey;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "byParent",
        KeyConditionExpression: "userId = :u AND parentId = :p",
        ExpressionAttributeValues: { ":u": userId, ":p": folderId },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

// Borra un item y, si es carpeta, todo su contenido (recursivo)
async function purge(userId, item) {
  if (item.type === "folder") {
    const children = await getChildren(userId, item.itemId);
    for (const child of children) await purge(userId, child);
  } else if (item.s3Key) {
    await s3.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: item.s3Key }),
    );
  }
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, itemId: item.itemId },
    }),
  );
}

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
  // Solo se puede borrar definitivamente lo que está en la papelera
  if (!Item || !Item.deletedAt)
    return json(404, { message: "No está en la papelera" });

  await purge(userId, Item);
  return json(204);
};
