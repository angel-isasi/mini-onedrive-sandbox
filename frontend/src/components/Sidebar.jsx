import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import UploadButton from './UploadButton'
import NewFolderButton from './NewFolderButton'
import { getCurrentUser, signOut } from '../auth/cognito'

const links = ['Recientes', 'Compartidos', 'Papelera'] // se implementan en módulo 10

export default function Sidebar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = getCurrentUser()

  function handleSignOut() {
    signOut()
    queryClient.clear() // borra datos en caché del usuario anterior
    navigate({ to: '/login' })
  }

  return (
    <aside className="w-60 border-r border-gray-200 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <UploadButton />
        <NewFolderButton />
      </div>

      <nav className="flex flex-col gap-1">
        <Link
          to="/"
          className="px-3 py-2 rounded-md hover:bg-gray-100"
          activeProps={{ className: 'bg-gray-100 font-medium' }}
          activeOptions={{ exact: true }}
        >
          Mis archivos
        </Link>
        {links.map((link) => (
          <a key={link} href="#" className="px-3 py-2 rounded-md text-gray-400 cursor-not-allowed">
            {link}
          </a>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 text-sm text-gray-600">
        <div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div className="h-2 bg-blue-600 rounded-full w-1/4" />
          </div>
          <p className="mt-2">250 MB de 1 GB usados</p>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="truncate" title={user?.email}>{user?.email}</p>
          <button onClick={handleSignOut} className="mt-1 text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}