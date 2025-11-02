import { Button } from '@/components/ui/button'
import { register } from '@/services/user/register'
import { setAuthDataAtom } from '@/store/authSlice'
import type { RegisterRequest } from '@/typings/userProgress'
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const setAuthData = useSetAtom(setAuthDataAtom)

  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    password: '',
    email: '',
    securityQuestion: '',
    securityAnswer: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof RegisterRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = '用户名至少3个字符'
    }

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = '密码至少8个字符'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (!formData.securityQuestion) {
      newErrors.securityQuestion = '请输入安全问题'
    }

    if (!formData.securityAnswer) {
      newErrors.securityAnswer = '请输入安全答案'
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
      const response = await register(formData)

      // Save auth data to state (will be persisted by authSlice)
      setAuthData({
        token: response.token,
        username: response.user.username,
        progress: response.progress,
      })

      // Navigate to main page
      navigate('/')
    } catch (error: any) {
      const message = error.message || '注册失败，请重试'

      // Handle specific error cases
      if (message.includes('Username') && message.includes('already exists')) {
        setErrors({ username: '用户名已存在' })
      } else if (message.includes('Email') && message.includes('already in use')) {
        setErrors({ email: '邮箱已被使用' })
      } else {
        setErrors({ general: message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">创建新账户</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">注册后可跨设备同步学习进度</p>
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
                用户名 *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange('username')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="至少3个字符"
              />
              {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                密码 *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange('password')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="至少8个字符"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                邮箱（可选）
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="example@email.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="securityQuestion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                安全问题 *
              </label>
              <input
                id="securityQuestion"
                name="securityQuestion"
                type="text"
                required
                value={formData.securityQuestion}
                onChange={handleChange('securityQuestion')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="例如：您的小学名称"
              />
              {errors.securityQuestion && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.securityQuestion}</p>}
            </div>

            <div>
              <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                安全答案 *
              </label>
              <input
                id="securityAnswer"
                name="securityAnswer"
                type="text"
                required
                value={formData.securityAnswer}
                onChange={handleChange('securityAnswer')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="请输入答案"
              />
              {errors.securityAnswer && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.securityAnswer}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              已有账户？去登录
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? '注册中...' : '注册'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
