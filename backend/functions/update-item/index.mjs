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
  body: JSON.stringify(body),
});

const getItem = async (userId, itemId) =>
  (
    await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { userId, itemId } }),
    )
  ).Item;

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) return json(401, { message: "No autorizado" });

  const id = event.pathParameters?.id;
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { message: "JSON inválido" });
  }
  const { name, folderId } = body;
  if (name === undefined && folderId === undefined)
    return json(400, { message: "Nada que actualizar" });

  const item = await getItem(userId, id);
  if (!item || item.deletedAt) return json(404, { message: "No existe" });

  const sets = ["updatedAt = :now"];
  const values = { ":now": new Date().toISOString() };

  // Renombrar
  if (name !== undefined) {
    const clean = String(name).trim();
    if (!clean || clean.length > 100)
      return json(400, { message: "Nombre inválido (1 a 100 caracteres)" });
    sets.push("#n = :name");
    values[":name"] = clean;
  }

  // Mover
  if (folderId !== undefined && folderId !== item.parentId) {
    if (folderId === id)
      return json(400, {
        message: "No puedes mover una carpeta dentro de sí misma",
      });
    if (folderId !== "root") {
      const target = await getItem(userId, folderId);
      if (!target || target.type !== "folder" || target.deletedAt) {
        return json(400, { message: "Carpeta destino inválida" });
      }
      // Si muevo una carpeta, el destino no puede estar dentro de ella
      if (item.type === "folder") {
        let current = target;
        for (let i = 0; i < 20 && current && current.parentId !== "root"; i++) {
          if (current.parentId === id) {
            return json(400, {
              message:
                "No puedes mover una carpeta dentro de una subcarpeta suya",
            });
          }
          current = await getItem(userId, current.parentId);
        }
      }
    }
    sets.push("parentId = :p");
    values[":p"] = folderId;
  }

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, itemId: id },
      UpdateExpression: "SET " + sets.join(", "),
      ...(name !== undefined && { ExpressionAttributeNames: { "#n": "name" } }),
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }),
  );

  const a = res.Attributes;
  return json(200, { id: a.itemId, name: a.name, parentId: a.parentId });
};
