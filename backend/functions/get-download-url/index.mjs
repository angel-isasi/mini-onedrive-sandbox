import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const { TABLE_NAME, BUCKET_NAME } = process.env;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  const id = event.pathParameters?.id;
  const inline = event.queryStringParameters?.inline === "1"; // modo visor

  const { Item } = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, itemId: id },
    }),
  );
  if (!Item || Item.type !== "file" || Item.deletedAt) {
    return json(404, { message: "Archivo no encontrado" });
  }

  // Nombre seguro para la cabecera (encodeURIComponent soporta tildes y espacios)
  const filename = encodeURIComponent(Item.name);
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`;

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: Item.s3Key,
      ResponseContentDisposition: disposition,
      // En modo visor forzamos el tipo correcto para que el navegador sepa mostrarlo
      ...(inline &&
        Item.contentType && { ResponseContentType: Item.contentType }),
    }),
    { expiresIn: 300 },
  );

  return json(200, {
    downloadUrl: url,
    contentType: Item.contentType,
    name: Item.name,
  });
};
