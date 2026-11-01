import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getFiles, getDownloadUrl, deleteFile, updateItem } from '../api/files'
import { formatSize, formatDate } from '../utils/format'
import MoveDialog from './MoveDialog'

export default function FileList({ folderId = 'root' }) {
  const queryClient = useQueryClient()
  const [moving, setMoving] = useState(null) // item que se está moviendo

  const { data: files = [], isPending, isError, error } = useQuery({
    queryKey: ['files', folderId],
    queryFn: () => getFiles(folderId),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
    onError: (err) => alert(err.message),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => updateItem(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['folderPath'] })
    },
    onError: (err) => alert(err.message),
  })

  const moveMutation = useMutation({
    mutationFn: ({ id, folderId }) => updateItem(id, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['folderPath'] })
      setMoving(null)
    },
    onError: (err) => alert(err.message), // ej: mover carpeta dentro de sí misma
  })

  async function handleDownload(id) {
    try {
      const url = await getDownloadUrl(id)
      window.location.assign(url)
    } catch (err) {
      alert(err.message)
    }
  }

  function handleDelete(file) {
    if (!confirm(`¿Mover "${file.name}" a la papelera?`)) return
    deleteMutation.mutate(file.id)
  }

  function handleRename(file) {
    const name = prompt('Nuevo nombre:', file.name)
    if (name === null) return
    const clean = name.trim()
    if (!clean || clean === file.name) return
    renameMutation.mutate({ id: file.id, name: clean })
  }

  function handleMove(targetId) {
    if (targetId === folderId) return setMoving(null) // ya está aquí
    moveMutation.mutate({ id: moving.id, folderId: targetId })
  }

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
    <>
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
          {files.map((file) => {
            const isFolder = file.type === 'folder'

            return (
              <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3">
                  {isFolder ? (
                    <Link
                      to="/folders/$folderId"
                      params={{ folderId: file.id }}
                      className="hover:underline"
                    >
                      📁 {file.name}
                    </Link>
                  ) : (
                    <span>📄 {file.name}</span>
                  )}
                </td>
                <td className="py-3 text-gray-600">{formatDate(file.updatedAt)}</td>
                <td className="py-3 text-gray-600">
                  {isFolder ? '—' : formatSize(file.size)}
                </td>
                <td className="py-3 text-right space-x-3">
                  {!isFolder && (
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Descargar
                    </button>
                  )}
                  <button
                    onClick={() => handleRename(file)}
                    disabled={renameMutation.isPending}
                    className="text-sm text-gray-700 hover:underline disabled:opacity-50"
                  >
                    Renombrar
                  </button>
                  <button
                    onClick={() => setMoving(file)}
                    className="text-sm text-gray-700 hover:underline"
                  >
                    Mover
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deleteMutation.isPending}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {moving && (
        <MoveDialog
          item={moving}
          onMove={handleMove}
          onClose={() => setMoving(null)}
          isMoving={moveMutation.isPending}
        />
      )}
    </>
  )
}