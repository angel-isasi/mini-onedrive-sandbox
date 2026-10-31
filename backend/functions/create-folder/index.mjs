import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  // userId real: el "sub" del token, ya verificado por API Gateway (JWT authorizer)
  const USER_ID = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!USER_ID) return response(401, { message: "No autorizado" });

  let body;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return response(400, { message: "Body JSON inválido" });
  }

  const name = body.name?.trim();
  const parentId = body.parentId || "root";

  if (!name) return response(400, { message: "El nombre es obligatorio" });
  if (name.length > 100)
    return response(400, { message: "Máximo 100 caracteres" });

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId: USER_ID,
        itemId: id,
        type: "folder",
        name,
        parentId,
        createdAt: now,
        updatedAt: now,
      },
    }),
  );

  return response(201, { id });
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
