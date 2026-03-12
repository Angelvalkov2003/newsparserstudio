import { useState } from 'react'
import { useAuth } from '../context'
import './LoginPage.css'

export function LoginPage() {
  const { login, loginAsGuest, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const clearSessionMessageOnInteraction = () => {
    if (sessionExpiredMessage) clearSessionExpiredMessage()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await login(name, password)
      if (!result.success) {
        setError(result.error ?? 'Login error.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuest = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await loginAsGuest()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Universal Markdown Builder Studio</p>

        {sessionExpiredMessage && (
          <p className="login-session-expired" role="alert">
            {sessionExpiredMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-name">Username</label>
            <input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearSessionMessageOnInteraction() }}
              onFocus={clearSessionMessageOnInteraction}
              placeholder="Username"
              autoComplete="username"
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearSessionMessageOnInteraction() }}
              onFocus={clearSessionMessageOnInteraction}
              placeholder="Password"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="login-actions">
            <button type="submit" className="login-btn login-btn--primary" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Login'}
            </button>
          </div>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-btn login-btn--guest"
          onClick={handleGuest}
          disabled={submitting}
        >
          {submitting ? '…' : 'Continue as guest'}
        </button>
        <p className="login-guest-hint">Guest does not enter username or password. No access to the Users panel.</p>
      </div>
    </div>
  )
}
