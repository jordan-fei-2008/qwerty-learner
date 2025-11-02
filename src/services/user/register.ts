import { http } from './http'
import type { AuthResponse, RegisterRequest } from '@/typings/userProgress'

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>('/auth/register', request)
}
