import { LoginWarning } from '@/components/LoginWarning'
import { Button } from '@/components/ui/button'
import { login } from '@/services/user/login'
import { hasOfflineOperations } from '@/services/user/progressSync'
import { progressAtom } from '@/state/progressAtoms'
import { setAuthDataAtom } from '@/store/authSlice'
import type { LoginRequest } from '@/typings/userProgress'
import { useSetAtom } from 'jotai'
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

      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">登录账户</h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">登录后可跨设备同步学习进度</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">{errors.general}</p>
              </div>
            )}

            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  用户名
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange('username')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="请输入用户名"
                />
                {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange('password')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="请输入密码"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/register')}
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  没有账户？去注册
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400"
                >
                  忘记密码？
                </Button>
              </div>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? '登录中...' : '登录'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
