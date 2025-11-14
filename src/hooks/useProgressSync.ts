import { patchProgress } from '@/services/progress/api'
import { prepareReplay } from '@/services/progress/offlineBuffer'
import {
  type ProgressResponse,
  clearProgressSync,
  initProgressSync,
  queueProgressUpdate,
  setSyncCallbacks,
  syncNow as syncNowService,
} from '@/services/user/progressSync'
import { progressAtom as newProgressAtom } from '@/state/progressAtoms'
import { authTokenAtom, isAuthenticatedAtom, lastSyncAtAtom, pendingOpsCountAtom, progressAtom } from '@/store/authSlice'
import type { UserProgress } from '@/typings/progress'
import { useAtom, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'

export function useProgressSync() {
  const [token] = useAtom(authTokenAtom)
  const [isAuthenticated] = useAtom(isAuthenticatedAtom)
  const setProgress = useSetAtom(progressAtom)
  const setNewProgress = useSetAtom(newProgressAtom)
  const setLastSyncAt = useSetAtom(lastSyncAtAtom)
  const [pendingCount, setPendingCount] = useAtom(pendingOpsCountAtom)
  const [isSyncing, setIsSyncing] = useState(false)

  // T028: Online event listener for offline buffer replay
  useEffect(() => {
    const handleOnline = async () => {
      if (!isAuthenticated) return

      console.log('[ProgressSync] Online detected, attempting buffer replay')
      const { patch, onSuccess, onFailure } = prepareReplay()

      if (!patch) {
        console.log('[ProgressSync] No buffered patches to replay')
        return
      }

      try {
        setIsSyncing(true)
        const response = await patchProgress(patch)
        setNewProgress(response.progress)
        onSuccess()
        console.log('[ProgressSync] Buffer replay successful')
      } catch (error) {
        onFailure()
        console.error('[ProgressSync] Buffer replay failed:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [isAuthenticated, setNewProgress])

  // Initialize sync service when token changes
  useEffect(() => {
    if (token && isAuthenticated) {
      initProgressSync(token)

      // Set up callbacks
      setSyncCallbacks({
        onSyncStart: () => {
          setIsSyncing(true)
        },
        onSyncSuccess: (response: ProgressResponse) => {
          setIsSyncing(false)
          // Update local progress with server response
          // Normalize lastLearnedDate to string|null for compatibility
          // Normalize lastLearnedDate and sessionPointer for compatibility
          const normalizedProgress: UserProgress = {
            ...response.progress,
            stats: {
              ...response.progress.stats,
              lastLearnedDate: response.progress.stats.lastLearnedDate === undefined ? null : response.progress.stats.lastLearnedDate,
            },
            sessionPointer: response.progress.sessionPointer
              ? {
                  wordsetId: response.progress.sessionPointer.wordsetId || response.progress.sessionPointer.wordset || '',
                  nextIndex: response.progress.sessionPointer.nextIndex,
                }
              : null,
          }
          setProgress(normalizedProgress)
          setLastSyncAt(Date.now())
          setPendingCount(0)
        },
        onSyncError: (error: Error) => {
          setIsSyncing(false)
          console.error('Sync error:', error)
        },
        onBufferChange: (count: number) => {
          setPendingCount(count)
        },
      })
    } else {
      // T033: Clear buffer on logout
      clearProgressSync()
      setPendingCount(0)
      setIsSyncing(false)
      // Also clear new progress atom
      setNewProgress(null)
    }
  }, [token, isAuthenticated, setProgress, setLastSyncAt, setPendingCount, setNewProgress])

  /**
   * Queue a progress update (will be debounced)
   */
  const syncProgress = (update: Partial<UserProgress>) => {
    if (!isAuthenticated) {
      console.warn('Cannot sync progress: not authenticated')
      return
    }
    queueProgressUpdate(update)
  }

  /**
   * Immediately flush all pending updates
   */
  const syncNow = async () => {
    if (!isAuthenticated) {
      console.warn('Cannot sync: not authenticated')
      return
    }
    await syncNowService()
  }

  return {
    syncProgress,
    syncNow,
    pendingCount,
    isSyncing,
    isAuthenticated,
  }
}
