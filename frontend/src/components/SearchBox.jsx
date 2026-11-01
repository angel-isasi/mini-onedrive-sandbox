import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export default function SearchBox({ onSearch }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    const clean = q.trim()
    if (clean.length < 2) return
    navigate({ to: '/search', search: { q: clean } })
    onSearch?.() // cierra el menú en móvil
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Buscar..."
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </form>
  )
}