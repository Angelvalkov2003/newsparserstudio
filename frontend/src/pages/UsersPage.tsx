import { useState, useEffect, useCallback } from 'react'
import { fetchUsers, createUser, updateUser, type UserPublic } from '../api'
import { useIsAdmin } from '../context/authContext'

export function UsersPage() {
  const isAdmin = useIsAdmin()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('regular')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    try {
      const list = await fetchUsers()
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Enter username.')
      return
    }
    if (!password) {
      setError('Enter password.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await createUser(trimmed, password, role)
      setUsername('')
      setPassword('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (u: UserPublic) => {
    if (u.role !== 'regular' || u.is_guest) return
    try {
      await updateUser(u.id, { is_verified_by_admin: !u.is_verified_by_admin })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  if (!isAdmin) {
    return (
      <div className="form-page">
        <h1>Users</h1>
        <p style={{ color: 'var(--editor-muted)' }}>Only admins can manage users.</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      <h1>Users</h1>
      <p style={{ color: 'var(--editor-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
        Create users (admin or regular). Regular users must be verified by an admin to log in.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="user-name">Username</label>
          <input
            id="user-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
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
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="regular">Regular</option>
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
        {loading ? (
          <p className="list-section-empty">Loading…</p>
        ) : users.length === 0 ? (
          <p className="list-section-empty">No users yet.</p>
        ) : (
          <ul className="users-list">
            {users.map((u) => (
              <li key={u.id} className="list-item list-item--crud users-list-item">
                <div>
                  <strong>{u.username}</strong>
                  <span className="users-list-role">
                    {u.role === 'admin' ? 'Admin' : u.is_guest ? 'Guest' : 'Regular'}
                    {u.role === 'regular' && !u.is_guest && (
                      u.is_verified_by_admin ? ' (verified)' : ' (not verified)'
                    )}
                  </span>
                  {u.role === 'regular' && !u.is_guest && (
                    <button
                      type="button"
                      className="small-btn"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleVerify(u)}
                    >
                      {u.is_verified_by_admin ? 'Unverify' : 'Verify'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
