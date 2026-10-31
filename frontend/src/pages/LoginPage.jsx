import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { signIn, completeNewPassword } from '../auth/cognito'

export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('login') // 'login' | 'newPassword'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [session, setSession] = useState(null) // Session del challenge
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn(email.trim(), password)
      if (result.challenge === 'NEW_PASSWORD_REQUIRED') {
        setSession(result.session)
        setStep('newPassword')
      } else {
        navigate({ to: '/' })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleNewPassword(e) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await completeNewPassword(email.trim(), newPassword, session)
      navigate({ to: '/' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-600 focus:outline-none'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Mini OneDrive</h1>

        {step === 'login' ? (
          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500">Acceso solo por invitación.</p>
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Contraseña
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNewPassword} className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Es tu primer ingreso. Crea una contraseña nueva para reemplazar la temporal.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Nueva contraseña
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Confirmar contraseña
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <p className="text-xs text-gray-500">
              Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar y entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}