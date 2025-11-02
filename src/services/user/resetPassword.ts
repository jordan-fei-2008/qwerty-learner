import { http } from './http'

export interface SecurityQuestionRequest {
  username: string
}

export interface SecurityQuestionResponse {
  username: string
  securityQuestion: string
}

export interface ResetPasswordRequest {
  username: string
  securityAnswer: string
  newPassword: string
}

export interface ResetPasswordResponse {
  message: string
  status: number
}

/**
 * Get security question for a user
 */
export async function getSecurityQuestion(username: string): Promise<SecurityQuestionResponse> {
  return http.post<SecurityQuestionResponse>('/auth/security-question', { username })
}

/**
 * Reset password using security answer
 */
export async function resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  return http.post<ResetPasswordResponse>('/auth/reset-password', request)
}
