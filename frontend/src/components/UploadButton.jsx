import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getUploadUrl, uploadToS3 } from "../api/files";

export default function UploadButton() {
  const queryClient = useQueryClient();
  const { folderId = "root" } = useParams({ strict: false }); // carpeta actual según la URL
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // null = no hay subida
  const [error, setError] = useState(null);

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setProgress(0);
    try {
      const { uploadUrl } = await getUploadUrl(file, folderId);
      await uploadToS3(uploadUrl, file, setProgress);
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => inputRef.current.click()}
        disabled={progress !== null && progress < 100}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        + Subir archivo
      </button>
      <input ref={inputRef} type="file" hidden onChange={handleChange} />

      {progress !== null && (
        <div className="h-2 w-full rounded bg-gray-200">
          <div
            className="h-2 rounded bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {progress === 100 && <p className="text-sm text-green-600">Subido ✓</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}