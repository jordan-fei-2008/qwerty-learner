/**
 * Sync Status Badge Component
 * Feature: 002-learning-progress-integration
 *
 * Display current sync status indicator
 */
import { pendingCountAtom, syncStatusAtom } from '@/state/progressAtoms'
import { useAtomValue } from 'jotai'

export function SyncStatusBadge() {
  const syncStatus = useAtomValue(syncStatusAtom)
  const pendingCount = useAtomValue(pendingCountAtom)

  const getStatusDisplay = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          text: '同步中...',
          className: 'bg-blue-500 text-white',
          icon: '🔄',
        }
      case 'error':
        return {
          text: `同步失败 (${pendingCount} 待同步)`,
          className: 'bg-red-500 text-white',
          icon: '⚠️',
        }
      case 'offline':
        return {
          text: `离线 (${pendingCount} 待同步)`,
          className: 'bg-gray-500 text-white',
          icon: '📵',
        }
      case 'idle':
      default:
        if (pendingCount > 0) {
          return {
            text: `${pendingCount} 待同步`,
            className: 'bg-yellow-500 text-white',
            icon: '⏳',
          }
        }
        return {
          text: '已同步',
          className: 'bg-green-500 text-white',
          icon: '✓',
        }
    }
  }

  const { text, className, icon } = getStatusDisplay()

  return (
    <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${className}`} title={text}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}
