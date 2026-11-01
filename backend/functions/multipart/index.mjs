import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

// WHEN_REQUIRED: evita que las URLs firmadas exijan checksums que el navegador no envía
const s3 = new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED" });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const { BUCKET_NAME, TABLE_NAME } = process.env;
const PART_SIZE = 5 * 1024 * 1024; // 5 MB (mínimo de S3, salvo la última parte)
const MAX_SIZE = 1024 * 1024 * 1024; // 1 GB por archivo
const QUOTA = 1024 * 1024 * 1024; // 1 GB por usuario

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : "",
});

async function getUsedBytes(userId) {
  let used = 0;
  let lastKey;
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: TABLE_NAME,
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

// La key se arma siempre con el userId del token: nadie puede tocar archivos de otro
const keyFor = (userId, fileId) => `users/${userId}/${fileId}`;

async function start(userId, body) {
  const { name, contentType, size } = body;
  if (!name || !contentType || !size)
    return json(400, { message: "Faltan name, contentType o size" });
  if (size > MAX_SIZE) return json(400, { message: "Máximo 1 GB por archivo" });

  const used = await getUsedBytes(userId);
  if (used + size > QUOTA) {
    return json(413, {
      message:
        "No tienes espacio suficiente. Vacía la papelera o borra archivos.",
    });
  }

  const fileId = randomUUID();
  const Key = keyFor(userId, fileId);
  const { UploadId } = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key,
      ContentType: contentType,
    }),
  );

  const partCount = Math.ceil(size / PART_SIZE);
  const urls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: BUCKET_NAME,
          Key,
          UploadId,
          PartNumber: i + 1,
        }),
        { expiresIn: 3600 }, // 1 hora: subir un archivo grande puede tardar
      ),
    ),
  );

  return json(200, { fileId, uploadId: UploadId, partSize: PART_SIZE, urls });
}

async function complete(userId, body) {
  const {
    fileId,
    uploadId,
    parts,
    name,
    contentType,
    size,
    folderId = "root",
  } = body;
  if (!fileId || !uploadId || !Array.isArray(parts) || !parts.length || !name) {
    return json(400, { message: "Faltan datos para completar la subida" });
  }

  const Key = keyFor(userId, fileId);
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }))
          .sort((a, b) => a.PartNumber - b.PartNumber),
      },
    }),
  );

  // Recién ahora existe el archivo completo: guardamos los metadatos
  const now = new Date().toISOString();
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        itemId: fileId,
        type: "file",
        name,
        contentType,
        size,
        parentId: folderId,
        s3Key: Key,
        createdAt: now,
        updatedAt: now,
      },
    }),
  );

  return json(201, { id: fileId });
}

async function abort(userId, body) {
  const { fileId, uploadId } = body;
  if (!fileId || !uploadId)
    return json(400, { message: "Faltan fileId o uploadId" });
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: keyFor(userId, fileId),
      UploadId: uploadId,
    }),
  );
  return json(204);
}

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { message: "JSON inválido" });
  }

  try {
    switch (event.routeKey) {
      case "POST /files/multipart/start":
        return await start(userId, body);
      case "POST /files/multipart/complete":
        return await complete(userId, body);
      case "POST /files/multipart/abort":
        return await abort(userId, body);
      default:
        return json(404, { message: "Ruta no encontrada" });
    }
  } catch (err) {
    console.error(err);
    return json(500, { message: "Error en la subida por partes" });
  }
};
