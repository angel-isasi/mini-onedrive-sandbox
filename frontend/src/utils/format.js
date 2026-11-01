export function formatSize(bytes) {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  // sin decimales para B o números redondos (1 GB), uno para el resto (2.4 MB)
  return `${i === 0 || Number.isInteger(n) ? n : n.toFixed(1)} ${units[i]}`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
