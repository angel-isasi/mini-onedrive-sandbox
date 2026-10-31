import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import App from './App'
import FolderPage from './pages/FolderPage'
import LoginPage from './pages/LoginPage'
import { getSession } from './auth/cognito'

// Raíz: no pinta nada propio, solo la ruta hija
const rootRoute = createRootRoute({ component: Outlet })

// "/login" -> sin Sidebar. Si ya hay sesión, manda a "/"
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

// Layout protegido (Sidebar + contenido). Sin sesión -> "/login"
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app', // ruta sin path propio, solo agrupa
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: '/login' })
  },
  component: App,
})

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: () => <FolderPage folderId="root" />,
})

const folderRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/folders/$folderId',
  component: function FolderRouteComponent() {
    const { folderId } = folderRoute.useParams()
    return <FolderPage folderId={folderId} />
  },
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute, folderRoute]),
])

export const router = createRouter({ routeTree })