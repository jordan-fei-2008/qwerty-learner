import { Button } from '@/components/ui/button'
import { getSecurityQuestion, resetPassword } from '@/services/user/resetPassword'
import { ArrowRight, CheckCircle2, HelpCircle, KeyRound, Lock, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const navigate = useNavigate()

  // Step 1: Enter username
  const [step, setStep] = useState<'username' | 'answer' | 'success'>('username')
  const [username, setUsername] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')

  // Step 2: Answer security question
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Get security question
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!username.trim()) {
      setErrors({ username: '请输入用户名' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await getSecurityQuestion(username.trim())
      setSecurityQuestion(response.securityQuestion)
      setStep('answer')
    } catch (error: any) {
      const message = error.message || '获取安全问题失败'
      if (error.status === 404 || message.includes('not found')) {
        setErrors({ username: '用户不存在' })
      } else {
        setErrors({ general: message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: Submit answer and new password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}

    if (!securityAnswer.trim()) {
      newErrors.securityAnswer = '请输入安全问题答案'
    }

    if (!newPassword) {
      newErrors.newPassword = '请输入新密码'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = '密码至少8个字符'
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = '两次密码输入不一致'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword({
        username,
        securityAnswer: securityAnswer.trim(),
        newPassword,
      })

      setStep('success')
    } catch (error: any) {
      const message = error.message || '密码重置失败'

      if (error.status === 401 || message.includes('Incorrect')) {
        setErrors({ securityAnswer: '安全问题答案错误' })
      } else if (error.status === 404) {
        setErrors({ general: '用户不存在' })
      } else {
        setErrors({ general: message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-4 top-0 h-72 w-72 animate-pulse rounded-full bg-indigo-300 opacity-20 blur-3xl dark:bg-indigo-600"></div>
          <div className="absolute -right-4 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-300 opacity-20 blur-3xl delay-700 dark:bg-purple-600"></div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:bg-gray-900/80 dark:shadow-indigo-500/10">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent dark:from-green-400 dark:to-emerald-400">
                密码重置成功！
              </h2>
              <p className="mb-8 text-gray-600 dark:text-gray-400">您现在可以使用新密码登录了</p>
              <Button
                onClick={() => navigate('/login')}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 dark:shadow-indigo-500/30"
              >
                <span className="relative flex items-center justify-center gap-2">
                  前往登录
                  <ArrowRight className="h-5 w-5" />
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
              </Button>
            </div>
          </div>
          <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-xl"></div>
        </div>
      </div>
    )
  }

  if (step === 'answer') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-4 top-0 h-72 w-72 animate-pulse rounded-full bg-indigo-300 opacity-20 blur-3xl dark:bg-indigo-600"></div>
          <div className="absolute -right-4 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-300 opacity-20 blur-3xl delay-700 dark:bg-purple-600"></div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:bg-gray-900/80 dark:shadow-indigo-500/10">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
                重置密码
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                用户: <strong className="font-semibold text-gray-900 dark:text-gray-100">{username}</strong>
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleResetSubmit}>
              {errors.general && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-in slide-in-from-top-2 dark:border-red-800/50 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">{errors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Security Question Display */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">安全问题</label>
                  <div className="flex items-start gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800/50 dark:bg-indigo-900/20">
                    <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">{securityQuestion}</p>
                  </div>
                </div>

                {/* Security Answer */}
                <div className="group">
                  <label htmlFor="securityAnswer" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    答案
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                    <input
                      id="securityAnswer"
                      name="securityAnswer"
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={(e) => {
                        setSecurityAnswer(e.target.value)
                        if (errors.securityAnswer) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.securityAnswer
                            return newErrors
                          })
                        }
                      }}
                      className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                      placeholder="请输入安全问题答案"
                    />
                  </div>
                  {errors.securityAnswer && (
                    <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{errors.securityAnswer}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="group">
                  <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (errors.newPassword) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.newPassword
                            return newErrors
                          })
                        }
                      }}
                      className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                      placeholder="至少8个字符"
                    />
                  </div>
                  {errors.newPassword && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{errors.newPassword}</p>}
                </div>

                {/* Confirm Password */}
                <div className="group">
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (errors.confirmPassword) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.confirmPassword
                            return newErrors
                          })
                        }
                      }}
                      className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                      placeholder="再次输入新密码"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100 dark:shadow-indigo-500/30"
              >
                <span className="relative flex items-center justify-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  {isSubmitting ? '提交中...' : '重置密码'}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
              </Button>

              {/* Footer link */}
              <div className="border-t border-gray-200 pt-6 text-center dark:border-gray-700">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  返回登录
                </Button>
              </div>
            </form>
          </div>

          <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 opacity-20 blur-xl"></div>
        </div>
      </div>
    )
  }

  // Step 1: Username input
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-0 h-72 w-72 animate-pulse rounded-full bg-indigo-300 opacity-20 blur-3xl dark:bg-indigo-600"></div>
        <div className="absolute -right-4 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-300 opacity-20 blur-3xl delay-700 dark:bg-purple-600"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:bg-gray-900/80 dark:shadow-indigo-500/10">
          {/* Header with icon */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
            <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
              重置密码
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">输入您的用户名以继续</p>
          </div>

          <form className="space-y-6" onSubmit={handleUsernameSubmit}>
            {errors.general && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-in slide-in-from-top-2 dark:border-red-800/50 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">{errors.general}</p>
              </div>
            )}

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
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (errors.username) {
                      setErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.username
                        return newErrors
                      })
                    }
                  }}
                  className="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
                  placeholder="请输入用户名"
                />
              </div>
              {errors.username && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{errors.username}</p>}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100 dark:shadow-indigo-500/30"
            >
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? '获取中...' : '下一步'}
                <ArrowRight className="h-5 w-5" />
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
            </Button>

            {/* Footer link */}
            <div className="border-t border-gray-200 pt-6 text-center dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                返回登录
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
