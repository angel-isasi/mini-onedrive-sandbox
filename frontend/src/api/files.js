import { getSession, signOut } from "../auth/cognito";

const API_URL = import.meta.env.VITE_API_URL;

// fetch a nuestra API con el token de Cognito
async function apiFetch(path, options = {}) {
  const session = getSession();
  if (!session) {
    window.location.assign("/login");
    throw new Error("Sesión expirada");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: session.idToken,
    },
  });

  // Token inválido o vencido -> cerrar sesión
  if (res.status === 401) {
    signOut();
    window.location.assign("/login");
    throw new Error("Sesión expirada");
  }

  return res;
}

export async function getUploadUrl(file, folderId = "root") {
  const res = await apiFetch("/files/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      folderId,
    }),
  });
  if (!res.ok) throw new Error(`Error ${res.status} al pedir URL de subida`);
  return res.json(); // { uploadUrl, fileId }
}

// Subida directa a S3 (URL prefirmada, SIN token)
export function uploadToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Error ${xhr.status} subiendo a S3`));
    xhr.onerror = () => reject(new Error("Error de red subiendo a S3"));

    xhr.send(file);
  });
}

export async function getFiles(folderId = "root") {
  const res = await apiFetch(`/files?folderId=${encodeURIComponent(folderId)}`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar archivos`);
  return res.json();
}

export async function getDownloadUrl(id) {
  const res = await apiFetch(`/files/${id}/download`);
  if (!res.ok) throw new Error(`Error ${res.status} al descargar`);
  const { downloadUrl } = await res.json();
  return downloadUrl;
}

export async function deleteFile(id) {
  const res = await apiFetch(`/files/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error ${res.status} al eliminar`);
}

export async function createFolder(name, parentId = "root") {
  const res = await apiFetch("/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  if (!res.ok) throw new Error(`Error ${res.status} al crear carpeta`);
  return res.json();
}

export async function getFolderPath(folderId) {
  const res = await apiFetch(`/folders/${folderId}/path`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar la ruta`);
  return res.json();
}

export async function getTrash() {
  const res = await apiFetch("/trash");
  if (!res.ok) throw new Error(`Error ${res.status} al cargar la papelera`);
  return res.json();
}

export async function restoreItem(id) {
  const res = await apiFetch(`/files/${id}/restore`, { method: "POST" });
  if (!res.ok) throw new Error(`Error ${res.status} al restaurar`);
  return res.json();
}

export async function purgeItem(id) {
  const res = await apiFetch(`/trash/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error ${res.status} al borrar definitivamente`);
}

export async function updateItem(id, changes) {
  const res = await apiFetch(`/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status} al actualizar`);
  }
  return res.json();
}

export async function getRecent() {
  const res = await apiFetch("/recent");
  if (!res.ok) throw new Error(`Error ${res.status} al cargar recientes`);
  return res.json();
}
