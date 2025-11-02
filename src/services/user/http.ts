// Base HTTP client for API calls
import { globalLogout } from '@/store/authSlice'

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(public status: number, public statusText: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * T077: Unified error handling
 * Convert API errors to user-friendly Chinese messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Map HTTP status codes to Chinese messages
    switch (error.status) {
      case 400:
        return '请求参数错误'
      case 401:
        return '未授权，请重新登录'
      case 403:
        return '没有权限访问'
      case 404:
        return '请求的资源不存在'
      case 409:
        return '资源冲突'
      case 500:
        return '服务器错误，请稍后重试'
      case 503:
        return '服务暂时不可用'
      default:
        // Try to extract message from error response
        if (error.message) {
          return error.message
        }
        return `请求失败 (${error.status})`
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '未知错误'
}

/**
 * Check if error is due to network issues
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('fetch') || error.message.includes('network')
  }
  return false
}

interface RequestOptions extends RequestInit {
  token?: string
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers)
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error = new ApiError(response.status, response.statusText, errorText || 'Request failed')

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      console.warn('[HTTP] 401 Unauthorized - logging out and redirecting')
      // Use global logout to clear auth state
      globalLogout()
      // Redirect to login page (will be handled by ProtectedRoute on next render)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    throw error
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return undefined as T
}

export const http = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
}

export default http
