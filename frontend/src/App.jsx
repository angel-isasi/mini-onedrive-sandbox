import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import Sidebar from './components/Sidebar'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Fondo oscuro detrás del menú en móvil (clic = cerrar) */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Móvil: menú deslizable. Desktop (md+): siempre visible */}
      <div
        className={`fixed inset-y-0 left-0 z-40 bg-white transition-transform duration-200
          md:static md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior solo en móvil */}
        <header className="md:hidden flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="text-2xl leading-none"
          >
            ☰
          </button>
          <span className="font-semibold">Mini OneDrive</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}