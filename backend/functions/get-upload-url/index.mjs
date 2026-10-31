import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME;
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export const handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const { name, contentType, size } = body;

  if (!name || !contentType || !size) {
    return response(400, {
      message: "name, contentType y size son requeridos",
    });
  }
  if (size > MAX_SIZE) {
    return response(400, { message: "El archivo supera 100 MB" });
  }

  const userId = "test-user"; // en el módulo 8 vendrá de Cognito
  const fileId = randomUUID();
  const key = `users/${userId}/${fileId}`;

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
