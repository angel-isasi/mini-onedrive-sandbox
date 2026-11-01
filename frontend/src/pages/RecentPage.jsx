import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getRecent, getDownloadUrl } from '../api/files'
import { formatSize, formatDate } from '../utils/format'

export default function RecentPage() {
  const { data: files = [], isPending, isError, error } = useQuery({
    queryKey: ['files', 'recent'],
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
              <th className="py-2 font-medium hidden md:table-cell">Modificado</th>
              <th className="py-2 font-medium hidden sm:table-cell">Tamaño</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-2 max-w-0 w-full">
                  <span className="block truncate" title={file.name}>📄 {file.name}</span>
                </td>
                <td className="py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                  {formatDate(file.updatedAt)}
                </td>
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                  {formatSize(file.size)}
                </td>
                <td className="py-3 text-right text-sm">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="text-blue-600 hover:underline"
                    >
                      Descargar
                    </button>
                    <Link
                      to={file.parentId === 'root' ? '/' : '/folders/$folderId'}
                      params={file.parentId === 'root' ? undefined : { folderId: file.parentId }}
                      className="text-gray-700 hover:underline"
                    >
                      Abrir ubicación
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}