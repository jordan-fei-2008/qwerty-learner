import { authTokenAtom, isAuthenticatedAtom, logoutAtom } from '@/store/authSlice'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactElement
}

/**
 * Check if JWT token is expired
 * Note: Backend currently uses UUID tokens, not JWT
 * This function will skip expiration check for non-JWT tokens
 */
function isTokenExpired(token: string): boolean {
  try {
    // Handle JSON-stringified token from atomWithStorage
    let actualToken = token
    try {
      // Try to parse if it's JSON-stringified
      actualToken = JSON.parse(token)
    } catch {
      // Already a plain string, use as is
    }

    // JWT token format: header.payload.signature (3 parts separated by dots)
    const parts = actualToken.split('.')

    // If not a JWT (UUID or other format), assume it's valid
    if (parts.length !== 3) {
      console.log('[ProtectedRoute] Non-JWT token detected (UUID?), skipping expiration check')
      return false // Don't treat as expired
    }

    const payload = JSON.parse(atob(parts[1]))
    const exp = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()
    const isExpired = now >= exp - 10000

    console.log('[ProtectedRoute] Token expiry check:', {
      exp: new Date(exp).toISOString(),
      now: new Date(now).toISOString(),
      isExpired,
    })

    return isExpired
  } catch (error) {
    console.error('[ProtectedRoute] Failed to parse token:', error, 'token:', token?.substring(0, 50))
    // For non-JWT tokens, don't treat parsing errors as expired
    return false
  }
}

/**
 * Protected Route Component
 * Redirects to login page if:
 * 1. User is not authenticated
 * 2. Token is expired
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const token = useAtomValue(authTokenAtom)
  const logout = useSetAtom(logoutAtom)
  const location = useLocation()
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Wait for atom to load from localStorage before making auth decision
  useEffect(() => {
    // Give atom time to load from localStorage
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Debug logging on mount and token change
  useEffect(() => {
    const localStorageToken = localStorage.getItem('authToken')
    console.log('[ProtectedRoute] Debug info:', {
      isAuthenticated,
      atomToken: token,
      localStorageToken,
      tokenType: typeof token,
      tokenLength: token?.length,
      pathname: location.pathname,
      isInitialized,
    })
  }, [token, isAuthenticated, location.pathname, isInitialized])

  useEffect(() => {
    // Only check expiration if we actually have a token
    if (token && token !== 'null' && token.length > 0) {
      if (isTokenExpired(token)) {
        console.warn('[ProtectedRoute] Token expired, logging out')
        logout()
        setShouldRedirect(true)
      }
    }
  }, [token, logout])

  // Show nothing while initializing (prevents flash of login page)
  if (!isInitialized) {
    return null
  }

  if (!isAuthenticated || shouldRedirect) {
    console.warn('[ProtectedRoute] Redirecting to login:', { isAuthenticated, shouldRedirect, isInitialized })
    // Save the attempted URL to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
