import { getSession, signOut } from "../auth/cognito";

const API_URL = import.meta.env.VITE_API_URL;

// fetch a la API con el token de Cognito. Si expira (401) -> cierra sesión
async function apiFetch(path, options = {}) {
  const session = getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session && { Authorization: session.idToken }),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    signOut();
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }
  return res;
}

// ---------- Subida ----------
export async function getUploadUrl(file, folderId = "root") {
  const res = await apiFetch("/files/upload-url", {
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      folderId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || `Error ${res.status} al pedir URL de subida`,
    );
  }
  return res.json(); // { uploadUrl, fileId }
}

// PUT directo a S3 (sin token). XHR para tener progreso
export function uploadToS3(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Error ${xhr.status} al subir a S3`));
    xhr.onerror = () => reject(new Error("Error de red al subir"));
    xhr.send(file);
  });
}

// ---------- Archivos y carpetas ----------
export async function getFiles(folderId = "root") {
  const res = await apiFetch(`/files?folderId=${encodeURIComponent(folderId)}`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar archivos`);
  return res.json();
}

export async function getDownloadUrl(id) {
  const res = await apiFetch(`/files/${id}/download`);
  if (!res.ok) throw new Error(`Error ${res.status} al descargar`);
  const data = await res.json();
  return data.downloadUrl;
}

export async function getViewUrl(id) {
  const res = await apiFetch(`/files/${id}/download?inline=1`);
  if (!res.ok) throw new Error(`Error ${res.status} al abrir el archivo`);
  return res.json(); // { downloadUrl, contentType, name }
}

export async function deleteFile(id) {
  const res = await apiFetch(`/files/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error ${res.status} al eliminar`);
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

export async function createFolder(name, parentId = "root") {
  const res = await apiFetch("/folders", {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status} al crear carpeta`);
  }
  return res.json();
}

export async function getFolderPath(folderId) {
  const res = await apiFetch(`/folders/${folderId}/path`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar la ruta`);
  return res.json();
}

// ---------- Recientes ----------
export async function getRecent() {
  const res = await apiFetch("/recent");
  if (!res.ok) throw new Error(`Error ${res.status} al cargar recientes`);
  return res.json();
}

// ---------- Papelera ----------
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
