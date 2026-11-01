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

// ---------- Buscador ----------
export async function searchItems(q) {
  const res = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status} al buscar`);
  }
  return res.json();
}

// ---------- Cuota ----------
export async function getUsage() {
  const res = await apiFetch("/usage");
  if (!res.ok) throw new Error(`Error ${res.status} al cargar el uso`);
  return res.json(); // { used, trash, quota }
}

// ---------- Subida por partes (multipart) ----------
const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // > 10 MB -> por partes

async function postJson(path, body) {
  const res = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// Sube un trozo con XHR y devuelve su ETag (S3 lo manda en la cabecera)
function uploadPart(url, blob, onPartProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onPartProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300)
        return reject(new Error(`Error ${xhr.status} en una parte`));
      const etag = xhr.getResponseHeader("ETag");
      if (!etag)
        return reject(
          new Error(
            "S3 no devolvió ETag (revisa ExposeHeaders en el CORS del bucket)",
          ),
        );
      resolve(etag);
    };
    xhr.onerror = () => reject(new Error("Error de red al subir una parte"));
    xhr.send(blob);
  });
}

async function uploadMultipart(file, folderId, onProgress) {
  const contentType = file.type || "application/octet-stream";
  const { fileId, uploadId, partSize, urls } = await postJson(
    "/files/multipart/start",
    {
      name: file.name,
      contentType,
      size: file.size,
    },
  );

  const parts = [];
  let uploadedBefore = 0; // bytes de las partes ya terminadas
  try {
    for (let i = 0; i < urls.length; i++) {
      const blob = file.slice(i * partSize, (i + 1) * partSize);
      const etag = await uploadPart(urls[i], blob, (loaded) =>
        onProgress?.(Math.round(((uploadedBefore + loaded) / file.size) * 100)),
      );
      parts.push({ partNumber: i + 1, etag });
      uploadedBefore += blob.size;
    }
  } catch (err) {
    await postJson("/files/multipart/abort", { fileId, uploadId }).catch(
      () => {},
    );
    throw err;
  }

  return postJson("/files/multipart/complete", {
    fileId,
    uploadId,
    parts,
    name: file.name,
    contentType,
    size: file.size,
    folderId,
  });
}

// Punto único de subida: elige simple o por partes según el tamaño
export async function uploadFile(file, folderId = "root", onProgress) {
  if (file.size > MULTIPART_THRESHOLD) {
    return uploadMultipart(file, folderId, onProgress);
  }
  const { uploadUrl } = await getUploadUrl(file, folderId);
  await uploadToS3(uploadUrl, file, onProgress);
}
