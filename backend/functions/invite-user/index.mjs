import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// En HTTP API los grupos pueden llegar como "[admins otro]" o como array
function getGroups(claims) {
  const raw = claims?.["cognito:groups"];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .replace(/[\[\]]/g, "")
    .split(/[\s,]+/)
    .filter(Boolean);
}

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims?.sub) return json(401, { message: "No autorizado" });
  if (!getGroups(claims).includes("admins")) {
    return json(403, {
      message: "Solo un administrador puede invitar usuarios",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { message: "JSON inválido" });
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { message: "Correo inválido" });
  }

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
        DesiredDeliveryMediums: ["EMAIL"], // Cognito envía la contraseña temporal
      }),
    );
    return json(201, { email });
  } catch (err) {
    if (err.name === "UsernameExistsException") {
      return json(409, { message: "Ese correo ya tiene una cuenta" });
    }
    console.error(err);
    return json(500, { message: "No se pudo enviar la invitación" });
  }
};
