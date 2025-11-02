import { Button } from '@/components/ui/button'
import { getSecurityQuestion, resetPassword } from '@/services/user/resetPassword'
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
            <div className="mb-4 text-6xl">✅</div>
            <h2 className="mb-2 text-2xl font-bold text-green-900 dark:text-green-100">密码重置成功！</h2>
            <p className="mb-6 text-green-800 dark:text-green-200">您现在可以使用新密码登录了</p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              前往登录
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'answer') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">重置密码</h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              用户: <strong>{username}</strong>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}>
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">{errors.general}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">安全问题</label>
                <p className="mt-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {securityQuestion}
                </p>
              </div>

              <div>
                <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  答案
                </label>
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="请输入安全问题答案"
                />
                {errors.securityAnswer && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.securityAnswer}</p>}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  新密码
                </label>
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="至少8个字符"
                />
                {errors.newPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  确认新密码
                </label>
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="再次输入新密码"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => navigate('/login')}>
                返回登录
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? '提交中...' : '重置密码'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Step 1: Username input
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">重置密码</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">输入您的用户名以继续</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleUsernameSubmit}>
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              用户名
            </label>
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="请输入用户名"
            />
            {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
          </div>

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate('/login')}>
              返回登录
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? '获取中...' : '下一步'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
