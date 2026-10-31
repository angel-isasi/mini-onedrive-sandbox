import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getFolderPath } from '../api/files'

export default function Breadcrumb({ folderId }) {
  const isRoot = folderId === 'root'

  const { data: path = [] } = useQuery({
    queryKey: ['folderPath', folderId],
    queryFn: () => getFolderPath(folderId),
    enabled: !isRoot, // en la raíz no hace falta pedir nada
  })

  return (
    <nav className="flex items-center gap-2 text-2xl font-semibold">
      {isRoot ? (
        <span>Mis archivos</span>
      ) : (
        <Link to="/" className="text-gray-500 hover:text-gray-900 hover:underline">
          Mis archivos
        </Link>
      )}

      {path.map((folder, index) => {
        const isLast = index === path.length - 1
        return (
          <span key={folder.id} className="flex items-center gap-2">
            <span className="text-gray-400">›</span>
            {isLast ? (
              <span>{folder.name}</span>
            ) : (
              <Link
                to="/folders/$folderId"
                params={{ folderId: folder.id }}
                className="text-gray-500 hover:text-gray-900 hover:underline"
              >
                {folder.name}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}