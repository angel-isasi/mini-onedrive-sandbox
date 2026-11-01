import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getFiles, getDownloadUrl, deleteFile, updateItem } from '../api/files'
import { formatSize, formatDate } from '../utils/format'
import MoveDialog from './MoveDialog'

// Lee la vista guardada (localStorage puede fallar, por eso el try/catch)
function getSavedView() {
  try {
    return localStorage.getItem('fileView') || 'list'
  } catch {
    return 'list'
  }
}

export default function FileList({ folderId = 'root' }) {
  const queryClient = useQueryClient()
  const [moving, setMoving] = useState(null)
  const [view, setView] = useState(getSavedView)

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
    onError: (err) => alert(err.message),
  })

  function changeView(newView) {
    setView(newView)
    try {
      localStorage.setItem('fileView', newView)
    } catch {
      // si falla, la vista igual cambia en esta sesión
    }
  }

  async function handleDownload(id) {
    try {
      window.location.assign(await getDownloadUrl(id))
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
    if (targetId === folderId) return setMoving(null)
    moveMutation.mutate({ id: moving.id, folderId: targetId })
  }

  // Botones de acción, compartidos por la lista y la cuadrícula
  function Actions({ file }) {
    const isFolder = file.type === 'folder'
    return (
      <>
        {!isFolder && (
          <button onClick={() => handleDownload(file.id)} className="text-blue-600 hover:underline">
            Descargar
          </button>
        )}
        <button
          onClick={() => handleRename(file)}
          disabled={renameMutation.isPending}
          className="text-gray-700 hover:underline disabled:opacity-50"
        >
          Renombrar
        </button>
        <button onClick={() => setMoving(file)} className="text-gray-700 hover:underline">
          Mover
        </button>
        <button
          onClick={() => handleDelete(file)}
          disabled={deleteMutation.isPending}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          Eliminar
        </button>
      </>
    )
  }

  // Nombre: carpeta = link, archivo = texto
    function Name({ file, className = '', showIcon = true }) {
    const icon = showIcon ? (file.type === 'folder' ? '📁 ' : '📄 ') : ''
    if (file.type === 'folder') {
      return (
        <Link
          to="/folders/$folderId"
          params={{ folderId: file.id }}
          className={`hover:underline ${className}`}
          title={file.name}
        >
          {icon}{file.name}
        </Link>
      )
    }
    return <span className={className} title={file.name}>{icon}{file.name}</span>
  }

  const toggleBtn = (value, label) => (
    <button
      onClick={() => changeView(value)}
      className={`px-3 py-1 text-sm rounded-md ${
        view === value ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="flex justify-end gap-1 mt-4">
        {toggleBtn('list', '☰ Lista')}
        {toggleBtn('grid', '▦ Cuadrícula')}
      </div>

      {isPending && <p className="mt-6 text-sm text-gray-500">Cargando archivos...</p>}
      {isError && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      {!isPending && !isError && files.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">Esta carpeta está vacía.</p>
      )}

      {files.length > 0 && view === 'list' && (
        <table className="w-full mt-2 text-left">
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
                  <Name file={file} className="block truncate" />
                </td>
                <td className="py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                  {formatDate(file.updatedAt)}
                </td>
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                  {file.type === 'folder' ? '—' : formatSize(file.size)}
                </td>
                <td className="py-3 text-right text-sm">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                    <Actions file={file} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {files.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-2">
          {files.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm flex flex-col">
              <div className="text-4xl text-center py-3">
                {file.type === 'folder' ? '📁' : '📄'}
              </div>
              <Name file={file} showIcon={false} className="block truncate text-sm font-medium" />
              <p className="text-xs text-gray-500 mt-1">
                {file.type === 'folder' ? 'Carpeta' : formatSize(file.size)} · {formatDate(file.updatedAt)}
              </p>
              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-3 text-xs">
                <Actions file={file} />
              </div>
            </div>
          ))}
        </div>
      )}

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