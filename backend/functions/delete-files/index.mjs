import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const USER_ID = "test-user"; // se cambia en módulo 8 (Cognito)

export const handler = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return response(400, { message: "Falta el id" });

  const now = new Date().toISOString();

  try {
    // Borrado suave: solo marca deletedAt (el archivo sigue en S3 para la papelera)
    await db.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId: USER_ID, itemId: id },
        UpdateExpression: "SET deletedAt = :now, updatedAt = :now",
        ConditionExpression:
          "attribute_exists(itemId) AND attribute_not_exists(deletedAt)",
        ExpressionAttributeValues: { ":now": now },
      }),
    );
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return response(404, { message: "Archivo no encontrado" });
    }
    throw err;
  }

  return { statusCode: 204 };
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
