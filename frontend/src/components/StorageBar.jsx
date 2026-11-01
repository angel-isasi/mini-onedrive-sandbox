import { useQuery } from '@tanstack/react-query'
import { getUsage } from '../api/files'
import { formatSize } from '../utils/format'

export default function StorageBar() {
  // queryKey empieza con "files": se refresca solo al subir, borrar o vaciar papelera
  const { data, isPending, isError } = useQuery({
    queryKey: ['files', 'usage'],
    queryFn: getUsage,
  })

  if (isPending) return <p className="text-sm text-gray-400">Calculando espacio...</p>
  if (isError) return <p className="text-sm text-red-600">No se pudo cargar el espacio.</p>

  const percent = Math.min(100, (data.used / data.quota) * 100)
  const color = percent >= 90 ? 'bg-red-600' : percent >= 75 ? 'bg-yellow-500' : 'bg-blue-600'

  return (
    <div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.max(percent, 1)}%` }} // mínimo 1% para que se vea
        />
      </div>
      <p className="mt-2">
        {formatSize(data.used)} de {formatSize(data.quota)} usados
      </p>
      {data.trash > 0 && (
        <p className="text-xs text-gray-400">{formatSize(data.trash)} en la papelera</p>
      )}
    </div>
  )
}