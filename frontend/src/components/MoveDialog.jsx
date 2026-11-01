import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFiles } from '../api/files'

// Diálogo para elegir carpeta destino navegando por las carpetas
export default function MoveDialog({ item, onMove, onClose, isMoving }) {
  const [path, setPath] = useState([{ id: 'root', name: 'Mis archivos' }])
  const current = path[path.length - 1]

  const { data = [], isPending } = useQuery({
    queryKey: ['files', current.id],
    queryFn: () => getFiles(current.id),
  })

  // Solo carpetas, y nunca la propia carpeta que estoy moviendo
  const folders = data.filter((f) => f.type === 'folder' && f.id !== item.id)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-5">
        <h2 className="text-lg font-medium mb-1">Mover "{item.name}"</h2>

        {/* Ruta actual, clicable para volver atrás */}
        <div className="text-sm text-gray-500 mb-3">
          {path.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ' › '}
              <button className="hover:underline" onClick={() => setPath(path.slice(0, i + 1))}>
                {p.name}
              </button>
            </span>
          ))}
        </div>

        <ul className="border border-gray-200 rounded-md h-56 overflow-y-auto">
          {isPending && <li className="p-3 text-sm text-gray-500">Cargando...</li>}
          {!isPending && folders.length === 0 && (
            <li className="p-3 text-sm text-gray-500">No hay subcarpetas.</li>
          )}
          {folders.map((f) => (
            <li key={f.id}>
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => setPath([...path, { id: f.id, name: f.name }])}
              >
                📁 {f.name}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={() => onMove(current.id)}
            disabled={isMoving}
            className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isMoving ? 'Moviendo...' : 'Mover aquí'}
          </button>
        </div>
      </div>
    </div>
  )
}