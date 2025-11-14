import { LoginWarning } from '@/components/LoginWarning'
import { Button } from '@/components/ui/button'
import { login } from '@/services/user/login'
import { hasOfflineOperations } from '@/services/user/progressSync'
import { progressAtom } from '@/state/progressAtoms'
import { setAuthDataAtom } from '@/store/authSlice'
import type { LoginRequest } from '@/typings/userProgress'
import { useSetAtom } from 'jotai'
import { KeyRound, LogIn, User } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuthData = useSetAtom(setAuthDataAtom)
  const setProgress = useSetAtom(progressAtom)

  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [pendingLoginData, setPendingLoginData] = useState<any>(null)

  const handleChange = (field: keyof LoginRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.username) {
      newErrors.username = '请输入用户名'
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await login(formData)

      // Check if there are offline operations before logging in
      if (hasOfflineOperations()) {
        // Show warning and store response
        setPendingLoginData(response)
        setShowWarning(true)
        setIsSubmitting(false)
        return
      }

      // No offline data, proceed with login
      await proceedWithLogin(response)
    } catch (error: any) {
      const message = error.message || '登录失败，请重试'

      // Handle authentication errors
      if (error.status === 401 || message.includes('Invalid username or password')) {
        setErrors({ general: '用户名或密码错误' })
      } else {
        setErrors({ general: message })
      }
      setIsSubmitting(false)
    }
  }

  const proceedWithLogin = async (response: any) => {
    try {
      // Update atoms first (atomWithStorage will automatically sync to localStorage)
      setAuthData({
        token: response.token,
        username: response.user.username,
        progress: response.progress,
      })

      // Also set progress atom directly (response already contains progress from server)
      setProgress(response.progress)

      // Wait a moment for state updates
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Navigate back to the page user was trying to access, or to main page
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (error) {
      console.error('[Login] Error in proceedWithLogin:', error)
      throw error // Re-throw to be caught by handleSubmit
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWarningProceed = async () => {
    if (pendingLoginData) {
      try {
        await proceedWithLogin(pendingLoginData)
        setPendingLoginData(null)
        setShowWarning(false)
      } catch (error) {
        console.error('[Login] Error in handleWarningProceed:', error)
        setErrors({ general: '登录失败，请重试' })
      }
    }
  }

  const handleWarningCancel = () => {
    setPendingLoginData(null)
    setShowWarning(false)
    setIsSubmitting(false)
    // User can wait for sync or try again later
  }

  return (
    <>
      {showWarning && <LoginWarning onProceed={handleWarningProceed} onCancel={handleWarningCancel} />}

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-4 top-0 h-72 w-72 animate-pulse rounded-full bg-indigo-300 opacity-20 blur-3xl dark:bg-indigo-600"></div>
          <div className="absolute -right-4 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-300 opacity-20 blur-3xl delay-700 dark:bg-purple-600"></div>
        </div>

        <div className="relative w-full max-w-md">
          {/* Card with glass effect */}
          <div className="rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:bg-gray-900/80 dark:shadow-indigo-500/10">
            {/* Header with icon */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <KeyRound className="h-8 w-8 text-white" />
              </div>
              <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
                欢迎回来
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">登录后可跨设备同步学习进度</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-in slide-in-from-top-2 dark:border-red-800/50 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">{errors.general}</p>
                </div>
              )}

              <div className="space-y-5">
                {/* Username field */}
                <div className="group">
                  <label htmlFor="username" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    用户名
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleChange('username')}
                      className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                      placeholder="请输入用户名"
                    />
                  </div>
                  {errors.username && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{errors.username}</p>}
                </div>

                {/* Password field */}
                <div className="group">
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    密码
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange('password')}
                      className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                      placeholder="请输入密码"
                    />
                  </div>
                  {errors.password && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{errors.password}</p>}
                </div>
              </div>

              {/* Submit button with gradient */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100 dark:shadow-indigo-500/30"
              >
                <span className="relative flex items-center justify-center gap-2">
                  <LogIn className="h-5 w-5" />
                  {isSubmitting ? '登录中...' : '登录'}
                </span>
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
              </Button>

              {/* Footer links */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/register')}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  没有账户？去注册
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  忘记密码？
                </Button>
              </div>
            </form>
          </div>

          {/* Decorative gradient border */}
          <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-xl"></div>
        </div>
      </div>
    </>
  )
}
