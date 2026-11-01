import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrash, restoreItem, purgeItem } from "../api/files";
import { formatSize, formatDate } from "../utils/format";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["trash"],
    queryFn: getTrash,
  });

  // Tras restaurar o borrar, refresca la papelera y las listas de carpetas
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["trash"] });
    queryClient.invalidateQueries({ queryKey: ["files"] });
  };

  const restore = useMutation({ mutationFn: restoreItem, onSuccess: refresh });
  const purge = useMutation({ mutationFn: purgeItem, onSuccess: refresh });

  const handlePurge = (item) => {
    const msg = item.type === "folder"
      ? `¿Borrar "${item.name}" y todo su contenido para siempre?`
      : `¿Borrar "${item.name}" para siempre?`;
    if (confirm(msg)) purge.mutate(item.id);
  };

  if (isLoading) return <p className="text-sm text-gray-500">Cargando...</p>;
  if (isError) return <p className="text-sm text-red-600">Error al cargar la papelera.</p>;

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Papelera</h1>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">La papelera está vacía.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Eliminado</th>
              <th className="py-2 font-medium">Tamaño</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-3">
                  {item.type === "folder" ? "📁" : "📄"} {item.name}
                </td>
                <td className="py-3">{formatDate(item.deletedAt)}</td>
                <td className="py-3">{item.type === "folder" ? "—" : formatSize(item.size)}</td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => restore.mutate(item.id)}
                    disabled={restore.isPending}
                    className="text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Restaurar
                  </button>
                  <button
                    onClick={() => handlePurge(item)}
                    disabled={purge.isPending}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Borrar para siempre
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}