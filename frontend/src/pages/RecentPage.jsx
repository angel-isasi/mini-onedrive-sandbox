import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getRecent, getDownloadUrl } from '../api/files'
import { formatSize, formatDate } from '../utils/format'

export default function RecentPage() {
  const { data: files = [], isPending, isError, error } = useQuery({
    queryKey: ['files', 'recent'], // empieza con "files" para refrescarse junto a las demás listas
    queryFn: getRecent,
  })

  async function handleDownload(id) {
    try {
      window.location.assign(await getDownloadUrl(id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Recientes</h1>

      {isPending && <p className="mt-6 text-sm text-gray-500">Cargando...</p>}
      {isError && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      {!isPending && !isError && files.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">Todavía no hay archivos.</p>
      )}

      {files.length > 0 && (
        <table className="w-full mt-6 text-left">
          <thead className="text-sm text-gray-500 border-b border-gray-200">
            <tr>
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Modificado</th>
              <th className="py-2 font-medium">Tamaño</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3">📄 {file.name}</td>
                <td className="py-3 text-gray-600">{formatDate(file.updatedAt)}</td>
                <td className="py-3 text-gray-600">{formatSize(file.size)}</td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => handleDownload(file.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Descargar
                  </button>
                  {file.parentId === 'root' ? (
                    <Link to="/" className="text-sm text-gray-700 hover:underline">
                      Abrir ubicación
                    </Link>
                  ) : (
                    <Link
                      to="/folders/$folderId"
                      params={{ folderId: file.parentId }}
                      className="text-sm text-gray-700 hover:underline"
                    >
                      Abrir ubicación
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}