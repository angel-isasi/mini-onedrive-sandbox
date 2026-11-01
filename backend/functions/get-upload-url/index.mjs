import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({});
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET = process.env.BUCKET_NAME;
const TABLE = process.env.TABLE_NAME;
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB por archivo
const QUOTA = 1024 * 1024 * 1024; // 1 GB por usuario (igual que get-usage)

// Suma el tamaño de todos los archivos del usuario (incluye papelera)
async function getUsedBytes(userId) {
  let used = 0;
  let lastKey;
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        FilterExpression: "#t = :file",
        ExpressionAttributeNames: { "#t": "type", "#s": "size" },
        ExpressionAttributeValues: { ":u": userId, ":file": "file" },
        ProjectionExpression: "#s",
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of res.Items) used += item.size || 0;
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return used;
}

export const handler = async (event) => {
  // userId real: el "sub" del token, ya verificado por API Gateway (JWT authorizer)
  const USER_ID = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!USER_ID) return response(401, { message: "No autorizado" });

  let body;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return response(400, { message: "Body no es JSON válido" });
  }

  const { name, contentType, size, folderId = "root" } = body;

  if (!name || !contentType || !size) {
    return response(400, { message: "Faltan name, contentType o size" });
  }
  if (size > MAX_SIZE) {
    return response(400, { message: "Máximo 100 MB por archivo" });
  }

  // 0. Verificar cuota antes de crear nada
  const used = await getUsedBytes(USER_ID);
  if (used + size > QUOTA) {
    return response(413, {
      message:
        "No tienes espacio suficiente. Vacía la papelera o borra archivos.",
    });
  }

  const fileId = randomUUID();
  const key = `users/${USER_ID}/${fileId}`;

  // 1. Guardar metadatos en DynamoDB
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        userId: USER_ID,
        itemId: fileId,
        type: "file",
        name,
        contentType,
        size,
        parentId: folderId,
        s3Key: key,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  // 2. Generar URL prefirmada
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return response(200, { uploadUrl, fileId });
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
