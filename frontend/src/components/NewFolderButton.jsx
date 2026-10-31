import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { createFolder } from "../api/files";

export default function NewFolderButton() {
  const queryClient = useQueryClient();
  const { folderId = "root" } = useParams({ strict: false });

  const mutation = useMutation({
    mutationFn: (name) => createFolder(name, folderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
    onError: (err) => alert(err.message),
  });

  function handleClick() {
    const name = prompt("Nombre de la carpeta:")?.trim();
    if (!name) return;
    mutation.mutate(name);
  }

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
    >
      {mutation.isPending ? "Creando..." : "+ Nueva carpeta"}
    </button>
  );
}