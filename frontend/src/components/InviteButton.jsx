import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { inviteUser } from '../api/files'
import { getSession } from '../auth/cognito'

// Lee los grupos del ID token (solo para mostrar u ocultar el botón;
// la seguridad real la pone la Lambda con el 403)
function isAdmin() {
  try {
    const token = getSession()?.idToken
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (payload['cognito:groups'] || []).includes('admins')
  } catch {
    return false
  }
}

export default function InviteButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')

  const invite = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => setEmail(''),
  })

  if (!isAdmin()) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (email.trim()) invite.mutate(email.trim())
  }

  function close() {
    setOpen(false)
    setEmail('')
    invite.reset()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-left text-blue-600 hover:underline">
        + Invitar usuario
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={close}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-lg w-96 p-5 text-gray-900"
          >
            <h2 className="text-lg font-medium mb-1">Invitar usuario</h2>
            <p className="text-sm text-gray-500 mb-4">
              Recibirá un correo con una contraseña temporal.
            </p>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {invite.isSuccess && (
              <p className="text-sm text-green-600 mt-2">Invitación enviada a {invite.data.email} ✓</p>
            )}
            {invite.isError && <p className="text-sm text-red-600 mt-2">{invite.error.message}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={close} className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">
                Cerrar
              </button>
              <button
                type="submit"
                disabled={invite.isPending}
                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {invite.isPending ? 'Enviando...' : 'Invitar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}