import { hasOfflineOperations } from '@/services/user/progressSync'
import { useEffect, useState } from 'react'

interface LoginWarningProps {
  onProceed: () => void
  onCancel: () => void
}

export function LoginWarning({ onProceed, onCancel }: LoginWarningProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if there are offline operations
    if (hasOfflineOperations()) {
      setShow(true)
    }
  }, [])

  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center">
          <span className="mr-3 text-3xl">⚠️</span>
          <h2 className="text-xl font-bold text-gray-900">未同步的数据</h2>
        </div>

        <div className="mb-6 text-gray-700">
          <p className="mb-2">检测到您有未同步的学习进度数据。</p>
          <p className="mb-2">如果继续登录，这些数据将被云端数据覆盖并丢失。</p>
          <p className="font-semibold text-orange-600">建议您先返回，等待数据同步完成后再登录。</p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setShow(false)
              onCancel()
            }}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            返回等待同步
          </button>
          <button
            onClick={() => {
              setShow(false)
              onProceed()
            }}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            继续登录（丢弃本地数据）
          </button>
        </div>
      </div>
    </div>
  )
}
