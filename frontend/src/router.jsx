import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import App from './App'
import FolderPage from './pages/FolderPage'

// Ruta raíz: el layout (Sidebar + contenido)
const rootRoute = createRootRoute({ component: App })

// "/" -> carpeta root
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <FolderPage folderId="root" />,
})

// "/folders/abc-123" -> carpeta con ese id
const folderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/folders/$folderId',
  component: function FolderRouteComponent() {
    const { folderId } = folderRoute.useParams()
    return <FolderPage folderId={folderId} />
  },
})

const routeTree = rootRoute.addChildren([indexRoute, folderRoute])

export const router = createRouter({ routeTree })