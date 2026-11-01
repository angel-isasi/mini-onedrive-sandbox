import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrash, restoreItem, purgeItem } from "../api/files";
import { formatSize, formatDate } from "../utils/format";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["trash"],
    queryFn: getTrash,
  });

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
      <h1 className="text-2xl font-semibold mb-6">Papelera</h1>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">La papelera está vacía.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium hidden md:table-cell">Eliminado</th>
              <th className="py-2 font-medium hidden sm:table-cell">Tamaño</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 pr-2 max-w-0 w-full">
                  <span className="block truncate" title={item.name}>
                    {item.type === "folder" ? "📁" : "📄"} {item.name}
                  </span>
                </td>
                <td className="py-3 whitespace-nowrap hidden md:table-cell">
                  {formatDate(item.deletedAt)}
                </td>
                <td className="py-3 px-4 whitespace-nowrap hidden sm:table-cell">
                  {item.type === "folder" ? "—" : formatSize(item.size)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 whitespace-nowrap">
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}