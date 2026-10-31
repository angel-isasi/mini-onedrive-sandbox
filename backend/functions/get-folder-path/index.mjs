import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const USER_ID = "test-user"; // se cambia en módulo 8 (Cognito)
const MAX_DEPTH = 20; // evita bucles infinitos si hay datos corruptos

export const handler = async (event) => {
  let currentId = event.pathParameters?.id;
  if (!currentId) return response(400, { message: "Falta el id" });

  const path = [];

  // Sube de carpeta en carpeta usando parentId hasta llegar a "root"
  while (currentId && currentId !== "root" && path.length < MAX_DEPTH) {
    const { Item } = await db.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId: USER_ID, itemId: currentId },
      }),
    );

    if (!Item || Item.type !== "folder" || Item.deletedAt) {
      return response(404, { message: "Carpeta no encontrada" });
    }

    path.unshift({ id: Item.itemId, name: Item.name }); // agrega al inicio
    currentId = Item.parentId;
  }

  return response(200, path); // de la más externa a la actual
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
