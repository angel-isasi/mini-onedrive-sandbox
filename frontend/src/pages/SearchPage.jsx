import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { searchItems, getDownloadUrl } from '../api/files'
import { formatSize, formatDate } from '../utils/format'

export default function SearchPage({ q }) {
  const { data: items = [], isPending, isError, error } = useQuery({
    queryKey: ['files', 'search', q],
    queryFn: () => searchItems(q),
    enabled: q.trim().length >= 2,
  })

  async function handleDownload(id) {
    try {
      window.location.assign(await getDownloadUrl(id))
    } catch (err) {
      alert(err.message)
    }
  }

  if (q.trim().length < 2) {
    return <p className="text-sm text-gray-500">Escribe al menos 2 caracteres para buscar.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold truncate">Resultados para "{q}"</h1>

      {isPending && <p className="mt-6 text-sm text-gray-500">Buscando...</p>}
      {isError && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      {!isPending && !isError && items.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">No se encontró nada.</p>
      )}

      {items.length > 0 && (
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
            {items.map((item) => {
              const isFolder = item.type === 'folder'
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-2 max-w-0 w-full">
                    <span className="block truncate" title={item.name}>
                      {isFolder ? '📁' : '📄'} {item.name}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                    {isFolder ? '—' : formatSize(item.size)}
                  </td>
                  <td className="py-3 text-right text-sm">
                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                      {isFolder ? (
                        <Link
                          to="/folders/$folderId"
                          params={{ folderId: item.id }}
                          className="text-blue-600 hover:underline"
                        >
                          Abrir
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleDownload(item.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Descargar
                        </button>
                      )}
                      <Link
                        to={item.parentId === 'root' ? '/' : '/folders/$folderId'}
                        params={item.parentId === 'root' ? undefined : { folderId: item.parentId }}
                        className="text-gray-700 hover:underline"
                      >
                        Abrir ubicación
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}