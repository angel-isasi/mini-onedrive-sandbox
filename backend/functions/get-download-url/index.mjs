import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const s3 = new S3Client({});
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET_NAME = process.env.BUCKET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  // userId real: el "sub" del token, ya verificado por API Gateway (JWT authorizer)
  const USER_ID = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!USER_ID) return response(401, { message: "No autorizado" });

  const id = event.pathParameters?.id;
  if (!id) return response(400, { message: "Falta el id" });

  // 1. Verificar que el archivo existe y es de este usuario
  const { Item } = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId: USER_ID, itemId: id },
    }),
  );

  if (!Item || Item.type !== "file" || Item.deletedAt) {
    return response(404, { message: "Archivo no encontrado" });
  }

  // 2. Firmar URL de descarga (válida 5 minutos)
  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: Item.s3Key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(Item.name)}`,
    }),
    { expiresIn: 300 },
  );

  return response(200, { downloadUrl });
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
