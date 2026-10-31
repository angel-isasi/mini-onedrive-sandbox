const API_URL = import.meta.env.VITE_API_URL;

// 1. Pide al backend una URL prefirmada
export async function getUploadUrl(file, folderId = "root") {
  const res = await fetch(`${API_URL}/files/upload-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      folderId,
    }),
  });

  if (!res.ok) throw new Error(`Error pidiendo URL: ${res.status}`);
  return res.json(); // { uploadUrl, fileId }
}

// 2. Sube el archivo directo a S3, reportando el progreso
export function uploadToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "content-type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Error subiendo a S3: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Error de red subiendo a S3"));

    xhr.send(file);
  });
}

export async function getFiles(folderId = "root") {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/files?folderId=${encodeURIComponent(folderId)}`,
  );
  if (!res.ok) throw new Error(`Error ${res.status} al cargar archivos`);
  return res.json();
}
