const REGION = import.meta.env.VITE_COGNITO_REGION;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const COGNITO_URL = `https://cognito-idp.${REGION}.amazonaws.com/`;
const STORAGE_KEY = "sandbox-session";

// Llamada genérica a la API de Cognito (no necesita SDK, es un POST con JSON)
async function cognitoRequest(action, body) {
  const res = await fetch(COGNITO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(translateError(data));
  return data;
}

// 1. Login con email y contraseña
export async function signIn(email, password) {
  const data = await cognitoRequest("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });

  // Primer login: Cognito pide cambiar la contraseña temporal
  if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    return { challenge: "NEW_PASSWORD_REQUIRED", session: data.Session };
  }

  saveSession(data.AuthenticationResult);
  return { challenge: null };
}

// 2. Responder al challenge con la nueva contraseña
export async function completeNewPassword(email, newPassword, session) {
  const data = await cognitoRequest("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: CLIENT_ID,
    Session: session,
    ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
  });
  saveSession(data.AuthenticationResult);
}

// 3. Sesión en localStorage
function saveSession(result) {
  const session = {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresAt: Date.now() + result.ExpiresIn * 1000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!session || Date.now() > session.expiresAt) return null; // expirada
    return session;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
}

// Datos del usuario leídos del ID token (el JWT tiene 3 partes: header.payload.firma)
export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const payload = JSON.parse(atob(session.idToken.split(".")[1]));
  return { id: payload.sub, email: payload.email };
}

// Mensajes de error en español
function translateError(data) {
  const type = data.__type ?? "";
  if (type.includes("NotAuthorizedException"))
    return "Email o contraseña incorrectos.";
  if (type.includes("UserNotFoundException"))
    return "Email o contraseña incorrectos.";
  if (type.includes("InvalidPasswordException"))
    return "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.";
  if (type.includes("TooManyRequestsException"))
    return "Demasiados intentos. Espera un momento.";
  return data.message ?? "Error al iniciar sesión.";
}
