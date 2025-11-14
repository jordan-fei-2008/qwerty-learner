import { Button } from '@/components/ui/button'
import { register } from '@/services/user/register'
import { setAuthDataAtom } from '@/store/authSlice'
import type { RegisterRequest } from '@/typings/userProgress'
import { useSetAtom } from 'jotai'
import { HelpCircle, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 py-8 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-0 h-72 w-72 animate-pulse rounded-full bg-indigo-300 opacity-20 blur-3xl dark:bg-indigo-600"></div>
        <div className="absolute -right-4 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-300 opacity-20 blur-3xl delay-700 dark:bg-purple-600"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card with glass effect */}
        <div className="rounded-2xl bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:bg-gray-900/80 dark:shadow-indigo-500/10">
          {/* Header with icon */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <UserPlus className="h-7 w-7 text-white" />
            </div>
            <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
              创建新账户
            </h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">注册后可跨设备同步学习进度</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 animate-in slide-in-from-top-2 dark:border-red-800/50 dark:bg-red-900/20">
                <p className="text-xs font-medium text-red-800 dark:text-red-400">{errors.general}</p>
              </div>
            )}

            <div className="space-y-3">
              {/* Username field */}
              <div className="group">
                <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  用户名 *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange('username')}
                    className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                    placeholder="至少3个字符"
                  />
                </div>
                {errors.username && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.username}</p>}
              </div>

              {/* Password field */}
              <div className="group">
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  密码 *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange('password')}
                    className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                    placeholder="至少8个字符"
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>

              {/* Email field */}
              <div className="group">
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  邮箱（可选）
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                    placeholder="example@email.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              {/* Security Question field */}
              <div className="group">
                <label htmlFor="securityQuestion" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  安全问题 *
                </label>
                <div className="relative">
                  <HelpCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                  <input
                    id="securityQuestion"
                    name="securityQuestion"
                    type="text"
                    required
                    value={formData.securityQuestion}
                    onChange={handleChange('securityQuestion')}
                    className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                    placeholder="例如：您的小学名称"
                  />
                </div>
                {errors.securityQuestion && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.securityQuestion}</p>
                )}
              </div>

              {/* Security Answer field */}
              <div className="group">
                <label htmlFor="securityAnswer" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  安全答案 *
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                  <input
                    id="securityAnswer"
                    name="securityAnswer"
                    type="text"
                    required
                    value={formData.securityAnswer}
                    onChange={handleChange('securityAnswer')}
                    className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                    placeholder="请输入答案"
                  />
                </div>
                {errors.securityAnswer && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.securityAnswer}</p>
                )}
              </div>
            </div>

            {/* Submit button with gradient */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100 dark:shadow-indigo-500/30"
            >
              <span className="relative flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                {isSubmitting ? '注册中...' : '创建账户'}
              </span>
              {/* Shine effect on hover */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
            </Button>

            {/* Footer link */}
            <div className="border-t border-gray-200 pt-4 text-center dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                已有账户？去登录
              </Button>
            </div>
          </form>
        </div>

        {/* Decorative gradient border */}
        <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-xl"></div>
      </div>
    </div>
  )
}
