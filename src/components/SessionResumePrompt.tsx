import { Button } from '@/components/ui/button'
import { useSessionResume } from '@/hooks/useSessionResume'

interface SessionResumePromptProps {
  onResume: (wordset: string, nextIndex: number) => void
  onDismiss: () => void
}

export function SessionResumePrompt({ onResume, onDismiss }: SessionResumePromptProps) {
  const { currentSession, canResume } = useSessionResume()

  if (!canResume()) {
    return null
  }

  const session = currentSession()
  if (!session) {
    return null
  }

  return (
    <div className="mb-6 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
      <div className="mb-3 flex items-center">
        <span className="mr-2 text-2xl">📚</span>
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">检测到学习断点</h3>
      </div>

      <div className="mb-4 text-sm text-blue-800 dark:text-blue-200">
        <p className="mb-2">
          <strong>词库:</strong> {session.wordset}
        </p>
        <p>
          <strong>进度:</strong> 第 {session.nextIndex + 1} 个单词
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => onResume(session.wordset, session.nextIndex)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          继续学习
        </Button>
        <Button onClick={onDismiss} variant="outline">
          从头开始
        </Button>
      </div>
    </div>
  )
}
