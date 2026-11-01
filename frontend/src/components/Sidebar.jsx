import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import UploadButton from './UploadButton'
import NewFolderButton from './NewFolderButton'
import { getCurrentUser, signOut } from '../auth/cognito'
import SearchBox from './SearchBox'
import StorageBar from './StorageBar'
import InviteButton from './InviteButton'

const links = ['Compartidos'] // Fase 2 (según wireframes oficiales)

const linkClass = 'px-3 py-2 rounded-md hover:bg-gray-100'
const activeClass = { className: 'bg-gray-100 font-medium' }

// onNavigate: lo usa App para cerrar el menú en móvil al elegir una sección
export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = getCurrentUser()

  function handleSignOut() {
    signOut()
    queryClient.clear() // borra datos en caché del usuario anterior
    navigate({ to: '/login' })
  }

  return (
    <aside className="w-60 h-full border-r border-gray-200 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <UploadButton />
        <NewFolderButton />
      </div>
            <SearchBox onSearch={onNavigate} />

      <nav className="flex flex-col gap-1">
        <Link
          to="/"
          onClick={onNavigate}
          className={linkClass}
          activeProps={activeClass}
          activeOptions={{ exact: true }}
        >
          Mis archivos
        </Link>
        <Link to="/recent" onClick={onNavigate} className={linkClass} activeProps={activeClass}>
          Recientes
        </Link>
        {links.map((link) => (
          <a key={link} href="#" className="px-3 py-2 rounded-md text-gray-400 cursor-not-allowed">
            {link}
          </a>
        ))}
        <Link to="/trash" onClick={onNavigate} className={linkClass} activeProps={activeClass}>
          Papelera
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-3 text-sm text-gray-600">
                <StorageBar />

                <div className="border-t border-gray-200 pt-3 flex flex-col items-start gap-1">
          <p className="truncate w-full" title={user?.email}>{user?.email}</p>
          <InviteButton />
          <button onClick={handleSignOut} className="text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}