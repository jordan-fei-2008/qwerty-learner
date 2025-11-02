import { SyncNowButton } from '@/components/SyncNowButton'
import { Button } from '@/components/ui/button'
import { useProgressSync } from '@/hooks/useProgressSync'
import { authStateAtom, progressAtom } from '@/store/authSlice'
import type { UserProgress } from '@/typings/userProgress'
import { useAtom } from 'jotai'
import { useState } from 'react'

export default function ProgressTestPage() {
  const [progress, setProgress] = useAtom(progressAtom)
  const [authState] = useAtom(authStateAtom)
  const { syncProgress, pendingCount, isSyncing } = useProgressSync()
  const [testWord, setTestWord] = useState('')

  const handleAddMasteredWord = () => {
    if (!testWord.trim()) return

    const updatedProgress: UserProgress = {
      ...progress,
      masteredWords: [...progress.masteredWords, testWord.trim()],
      stats: {
        ...progress.stats,
        totalLearned: progress.stats.totalLearned + 1,
        todayLearned: progress.stats.todayLearned + 1,
      },
    }

    // Update local state
    setProgress(updatedProgress)

    // Queue sync to server (will be debounced)
    syncProgress(updatedProgress)

    // Clear input
    setTestWord('')
  }

  const handleIncrementStreak = () => {
    const updatedProgress: UserProgress = {
      ...progress,
      stats: {
        ...progress.stats,
        streakDays: progress.stats.streakDays + 1,
      },
    }

    setProgress(updatedProgress)
    syncProgress(updatedProgress)
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="mb-4 text-2xl font-bold">进度同步测试页面</h1>
        <p className="text-red-500">请先登录才能测试进度同步功能</p>
        <a href="/login" className="mt-4 inline-block text-blue-500 hover:underline">
          前往登录
        </a>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">进度同步测试页面</h1>
        <SyncNowButton />
      </div>

      {/* User info */}
      <div className="mb-6 rounded-lg border bg-gray-50 p-4">
        <h2 className="mb-2 font-semibold">用户信息</h2>
        <p>
          <strong>用户名:</strong> {authState.username}
        </p>
        <p>
          <strong>Token:</strong> {authState.token?.substring(0, 20)}...
        </p>
        <p>
          <strong>待同步操作:</strong> <span className={pendingCount > 0 ? 'text-orange-500' : 'text-green-500'}>{pendingCount}</span>
        </p>
        <p>
          <strong>同步状态:</strong>{' '}
          <span className={isSyncing ? 'text-blue-500' : 'text-gray-500'}>{isSyncing ? '同步中...' : '空闲'}</span>
        </p>
        <p>
          <strong>上次同步:</strong> {authState.lastSyncAt ? new Date(authState.lastSyncAt).toLocaleString() : '未同步'}
        </p>
      </div>

      {/* Current progress stats */}
      <div className="mb-6 rounded-lg border bg-blue-50 p-4">
        <h2 className="mb-2 font-semibold">当前进度统计</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">已掌握单词</p>
            <p className="text-2xl font-bold">{progress.masteredWords.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">今日学习</p>
            <p className="text-2xl font-bold">{progress.stats.todayLearned}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">连续打卡天数</p>
            <p className="text-2xl font-bold">{progress.stats.streakDays}</p>
          </div>
        </div>
      </div>

      {/* Test actions */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">测试操作</h2>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={testWord}
            onChange={(e) => setTestWord(e.target.value)}
            placeholder="输入要添加的单词"
            className="flex-1 rounded border px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddMasteredWord()
              }
            }}
          />
          <Button onClick={handleAddMasteredWord} disabled={!testWord.trim()}>
            添加掌握的单词
          </Button>
        </div>

        <Button onClick={handleIncrementStreak} variant="outline">
          增加连续打卡天数 +1
        </Button>

        <p className="mt-4 text-sm text-gray-600">💡 提示：修改后会在 3 秒内自动同步到服务器，或点击右上角"立即同步"按钮</p>
      </div>

      {/* Mastered words list */}
      {progress.masteredWords.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">已掌握的单词列表</h2>
          <div className="flex flex-wrap gap-2">
            {progress.masteredWords.map((word, index) => (
              <span key={index} className="rounded bg-green-100 px-2 py-1 text-sm">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
