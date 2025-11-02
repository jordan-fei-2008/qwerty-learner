import { progressAtom as newProgressAtom } from '@/state/progressAtoms'
import type { UserProgress } from '@/typings/progress'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Auth state
export interface AuthState {
  token: string | null
  username: string | null
  isAuthenticated: boolean
  progress: UserProgress | null
  lastSyncAt: number | null
  pendingOpsCount: number
}

// Fix for corrupted localStorage data (double-stringified tokens)
// This MUST run BEFORE creating atomWithStorage atoms
// atomWithStorage reads from localStorage on initialization
function fixCorruptedLocalStorage() {
  try {
    const storedToken = localStorage.getItem('authToken')
    if (storedToken) {
      console.log('[Auth] Checking token format:', storedToken.substring(0, 50))
      // Try to parse it - if it's double-stringified, fix it
      try {
        const parsed = JSON.parse(storedToken)
        // If parsed is still a string (double-stringified), it's already in correct format
        // atomWithStorage expects JSON-stringified values
        if (typeof parsed === 'string' && parsed.length > 0) {
          console.log('[Auth] Token is correctly formatted (JSON string)')
        }
      } catch (e) {
        // If parse fails, the value is a plain string, wrap it in JSON
        if (storedToken.length > 0 && !storedToken.startsWith('"')) {
          console.log('[Auth] Fixing non-JSON token in localStorage')
          localStorage.setItem('authToken', JSON.stringify(storedToken))
        }
      }
    }

    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      try {
        const parsed = JSON.parse(storedUsername)
        if (typeof parsed === 'string' && parsed.length > 0) {
          // Already correct format
        }
      } catch (e) {
        if (storedUsername.length > 0 && !storedUsername.startsWith('"')) {
          localStorage.setItem('username', JSON.stringify(storedUsername))
        }
      }
    }
  } catch (error) {
    console.error('[Auth] Failed to check localStorage data:', error)
  }
}

// Run fix before creating atoms
fixCorruptedLocalStorage()

// Store auth token in localStorage for persistence
export const authTokenAtom = atomWithStorage<string | null>('authToken', null)

// Store username in localStorage
export const usernameAtom = atomWithStorage<string | null>('username', null)

// Debug: Check what atomWithStorage actually loaded
const checkAtomValue = () => {
  const rawToken = localStorage.getItem('authToken')
  console.log('[Auth] After atom creation - localStorage value:', rawToken)
}
setTimeout(checkAtomValue, 0)

// Re-export progress atom from new location (for backward compatibility)
export const progressAtom = newProgressAtom

// Derived state for authentication status
export const isAuthenticatedAtom = atom((get) => {
  const token = get(authTokenAtom)
  const isAuth = token !== null && token !== '' && token.length > 0
  console.log('[isAuthenticatedAtom]', {
    token: token?.substring(0, 20) + '...',
    tokenType: typeof token,
    isNull: token === null,
    isEmpty: token === '',
    length: token?.length,
    isAuth,
  })
  return isAuth
})

// Last sync timestamp
export const lastSyncAtAtom = atom<number | null>(null)

// Pending operations count (for offline buffering)
export const pendingOpsCountAtom = atom<number>(0)

// Combined auth state atom (read-only)
export const authStateAtom = atom<AuthState>((get) => ({
  token: get(authTokenAtom),
  username: get(usernameAtom),
  isAuthenticated: get(isAuthenticatedAtom),
  progress: get(progressAtom),
  lastSyncAt: get(lastSyncAtAtom),
  pendingOpsCount: get(pendingOpsCountAtom),
}))

// Actions
export const setAuthDataAtom = atom(
  null,
  (get, set, { token, username, progress }: { token: string; username: string; progress: UserProgress }) => {
    set(authTokenAtom, token)
    set(usernameAtom, username)
    set(progressAtom, progress)
    set(lastSyncAtAtom, Date.now())
  },
)

export const updateProgressAtom = atom(null, (get, set, progress: UserProgress) => {
  set(progressAtom, progress)
  set(lastSyncAtAtom, Date.now())
})

export const logoutAtom = atom(null, (get, set) => {
  set(authTokenAtom, null)
  set(usernameAtom, null)
  set(progressAtom, null) // Clear progress on logout
  set(lastSyncAtAtom, null)
  set(pendingOpsCountAtom, 0)
})

// Global logout function for use outside React components (e.g., HTTP interceptors)
export function globalLogout() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('username')
  console.log('[Auth] Global logout - cleared localStorage')
}
