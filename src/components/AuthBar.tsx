import { isAuthenticatedAtom, logoutAtom, usernameAtom } from '@/store/authSlice'
import { useAtomValue, useSetAtom } from 'jotai'
import { useNavigate } from 'react-router-dom'

/**
 * AuthBar
 * Displays Login / Logout buttons based on authentication state.
 */
export function AuthBar() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const username = useAtomValue(usernameAtom)
  const logout = useSetAtom(logoutAtom)
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate('/login')
  }

  const handleLogout = () => {
    logout()
    // Stay on page; guest mode continues
  }

  return (
    <div className="flex w-full justify-end gap-2 bg-transparent px-4 py-2 text-sm">
      {!isAuthenticated && (
        <>
          <button onClick={handleLogin} className="rounded border border-primary px-3 py-1 transition hover:bg-primary hover:text-white">
            Login
          </button>
          <button
            onClick={() => navigate('/register')}
            className="rounded border border-primary px-3 py-1 transition hover:bg-primary hover:text-white"
          >
            Register
          </button>
        </>
      )}
      {isAuthenticated && (
        <>
          <span className="mr-2 text-gray-600 dark:text-gray-300">{username || 'User'}</span>
          <button
            onClick={handleLogout}
            className="rounded border border-red-500 px-3 py-1 text-red-600 transition hover:bg-red-500 hover:text-white"
          >
            Logout
          </button>
        </>
      )}
    </div>
  )
}

export default AuthBar
