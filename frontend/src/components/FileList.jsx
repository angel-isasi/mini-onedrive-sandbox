import { useQuery } from '@tanstack/react-query'
import { getFiles } from '../api/files'
import { formatSize, formatDate } from '../utils/format'

export default function FileList({ folderId = 'root' }) {
  const { data: files = [], isPending, isError, error } = useQuery({
    queryKey: ['files', folderId],
    queryFn: () => getFiles(folderId),
  })

  if (isPending) {
    return <p className="mt-6 text-sm text-gray-500">Cargando archivos...</p>
  }

  if (isError) {
    return <p className="mt-6 text-sm text-red-600">{error.message}</p>
  }

  if (files.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Esta carpeta está vacía.</p>
  }

  return (
    <table className="w-full mt-6 text-left">
      <thead className="text-sm text-gray-500 border-b border-gray-200">
        <tr>
          <th className="py-2 font-medium">Nombre</th>
          <th className="py-2 font-medium">Modificado</th>
          <th className="py-2 font-medium">Tamaño</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
            <td className="py-3">
              {file.type === 'folder' ? '📁' : '📄'} {file.name}
            </td>
            <td className="py-3 text-gray-600">{formatDate(file.updatedAt)}</td>
            <td className="py-3 text-gray-600">{formatSize(file.size)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}