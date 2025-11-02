import { http } from './http'
import type { AuthResponse, LoginRequest } from '@/typings/userProgress'

export async function login(request: LoginRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>('/auth/login', request)
}
