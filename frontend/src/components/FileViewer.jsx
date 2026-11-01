import { useQuery } from '@tanstack/react-query'
import { getViewUrl, getDownloadUrl } from '../api/files'

// Decide cómo mostrar el archivo según su tipo
function Preview({ url, type, name }) {
  if (type?.startsWith('image/')) {
    return <img src={url} alt={name} className="max-h-full max-w-full object-contain mx-auto" />
  }
  if (type === 'application/pdf') {
    return <iframe src={url} title={name} className="w-full h-full border-0" />
  }
  if (type?.startsWith('video/')) {
    return <video src={url} controls className="max-h-full max-w-full mx-auto" />
  }
  if (type?.startsWith('audio/')) {
    return <audio src={url} controls className="w-full mt-10" />
  }
  if (type?.startsWith('text/') || type === 'application/json') {
    return <iframe src={url} title={name} className="w-full h-full border-0 bg-white" />
  }
  return (
    <p className="text-center text-gray-500 mt-10">
      No hay vista previa para este tipo de archivo ({type || 'desconocido'}).
    </p>
  )
}

export default function FileViewer({ file, onClose }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['viewUrl', file.id],
    queryFn: () => getViewUrl(file.id),
    staleTime: 4 * 60 * 1000, // la URL firmada dura 5 min
  })

  async function handleDownload() {
    try {
      window.location.assign(await getDownloadUrl(file.id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      {/* Barra superior */}
      <div
        className="flex items-center gap-3 bg-white px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex-1 truncate font-medium" title={file.name}>📄 {file.name}</span>
        <button onClick={handleDownload} className="text-sm text-blue-600 hover:underline">
          Descargar
        </button>
        <button onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none px-2">
          ×
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
        {isPending && <p className="text-center text-white mt-10">Cargando...</p>}
        {isError && <p className="text-center text-red-300 mt-10">{error.message}</p>}
        {data && (
          <div className="h-full">
            <Preview url={data.downloadUrl} type={data.contentType} name={file.name} />
          </div>
        )}
      </div>
    </div>
  )
}