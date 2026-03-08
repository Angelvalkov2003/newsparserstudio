import { useState, useEffect } from 'react'

const STORAGE_KEY = 'umb_users'

export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  name: string
  password?: string
  role: UserRole
  createdAt: string
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

function nextId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setUsers(loadUsers())
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter name.')
      return
    }
    if (!password) {
      setError('Enter password.')
      return
    }
    setError(null)
    setSubmitting(true)
    const newUser: User = {
      id: nextId(),
      name: trimmedName,
      password: password,
      role,
      createdAt: new Date().toISOString(),
    }
    const next = [...users, newUser]
    setUsers(next)
    saveUsers(next)
    setName('')
    setPassword('')
    setRole('user')
    setSubmitting(false)
  }

  return (
    <div className="form-page">
      <h1>Users</h1>
      <p style={{ color: 'var(--editor-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
        This panel is only visible to users with the <strong>Admin</strong> role. Here you can create new users (name and password).
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="user-name">Name</label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="User name"
            autoComplete="off"
          />
        </div>
        <div className="form-group form-group--password">
          <label htmlFor="user-password">Password</label>
          <div className="password-input-wrap">
            <input
              id="user-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="new-password"
              className="password-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>

      <section className="list-section">
        <h2>Existing users</h2>
        {users.length === 0 ? (
          <p className="list-section-empty">No users created yet.</p>
        ) : (
          <ul className="users-list">
            {users.map((u) => (
              <li key={u.id} className="list-item list-item--crud users-list-item">
                <div>
                  <strong>{u.name}</strong>
                  <span className="users-list-role">{u.role === 'admin' ? 'Admin' : 'User'}</span>
                  <br />
                  <small style={{ color: 'var(--editor-muted)' }}>
                    Created: {new Date(u.createdAt).toLocaleString()}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
