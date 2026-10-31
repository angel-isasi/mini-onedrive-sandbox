import { Outlet } from '@tanstack/react-router'
import Sidebar from './components/Sidebar'

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}