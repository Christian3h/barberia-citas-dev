import { useState } from 'react'

interface AdminLoginProps {
  onLogin: () => void
  correctPin: string
  sessionKey: string
  sessionDuration: number
}

export function AdminLogin({
  onLogin, correctPin, sessionKey, sessionDuration
}: AdminLoginProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === correctPin) {
      localStorage.setItem(sessionKey, JSON.stringify({
        authenticated: true,
        expiry: Date.now() + sessionDuration
      }))
      onLogin()
    } else {
      setError('PIN incorrecto')
      setPin('')
    }
  }

  return (
    <div className="admin-login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">🔐</div>
        <h2>Panel Admin</h2>
        <p>Ingresa el PIN de administrador</p>

        {error && (
          <div className="login-error">{error}</div>
        )}

        <input
          type="password"
          className="pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          maxLength={6}
          autoFocus
        />

        <button type="submit" className="btn btn-primary btn-large">
          Ingresar
        </button>
      </form>
    </div>
  )
}