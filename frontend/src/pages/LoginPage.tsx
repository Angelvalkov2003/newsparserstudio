import { useState } from 'react'
import { useAuth } from '../context/authContext'
import './LoginPage.css'

export function LoginPage() {
  const { login, loginAsGuest } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = login(name, password)
    setSubmitting(false)
    if (!result.success) {
      setError(result.error ?? 'Login error.')
    }
  }

  const handleGuest = () => {
    setError(null)
    loginAsGuest()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Universal Markdown Builder Studio</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-name">Username</label>
            <input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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
        >
          Continue as guest
        </button>
        <p className="login-guest-hint">Guest does not enter username or password. No access to the Users panel.</p>
      </div>
    </div>
  )
}
