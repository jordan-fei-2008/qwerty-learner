import { Button } from '@/components/ui/button'
import { useProgressSync } from '@/hooks/useProgressSync'

export function SyncNowButton() {
  const { syncNow, pendingCount, isSyncing, isAuthenticated } = useProgressSync()

  // Don't show button if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleClick = async () => {
    await syncNow()
  }

  return (
    <Button onClick={handleClick} disabled={isSyncing || pendingCount === 0} variant="outline" size="sm" className="relative">
      {isSyncing ? (
        <>
          <span className="mr-2">⏳</span>
          同步中...
        </>
      ) : (
        <>
          <span className="mr-2">☁️</span>
          立即同步
          {pendingCount > 0 && <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">{pendingCount}</span>}
        </>
      )}
    </Button>
  )
}
