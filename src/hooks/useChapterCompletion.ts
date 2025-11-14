/**
 * Chapter Completion Hook
 * Feature: 002-learning-progress-integration
 *
 * Handle chapter completion and trigger progress sync
 */
import { patchProgress } from '@/services/progress/api'
import { applyPatchToLocalProgress } from '@/services/progress/merge'
import { enqueuePatch } from '@/services/progress/offlineBuffer'
import { buildChapterPatch } from '@/services/progress/patchBuilder'
import { progressAtom, syncStatusAtom } from '@/state/progressAtoms'
import { isAuthenticatedAtom } from '@/store/authSlice'
import type { ChapterResult } from '@/typings/progress'
import { useAtom } from 'jotai'
import { useCallback } from 'react'

/**
 * Hook for handling chapter completion
 * @returns onChapterComplete callback
 */
export function useChapterCompletion() {
  const [progress, setProgress] = useAtom(progressAtom)
  const [isAuthenticated] = useAtom(isAuthenticatedAtom)
  const [, setSyncStatus] = useAtom(syncStatusAtom)

  const onChapterComplete = useCallback(
    async (chapterResult: ChapterResult) => {
      console.log('[ChapterCompletion] ===== START =====')
      console.log('[ChapterCompletion] Chapter result:', chapterResult)
      console.log('[ChapterCompletion] Current progress:', progress)

      try {
        // Build patch from chapter result
        const patch = buildChapterPatch(chapterResult, progress)
        console.log('[ChapterCompletion] Built patch:', patch)

        // Apply optimistically to local state
        const updatedProgress = applyPatchToLocalProgress(progress, patch)
        console.log('[ChapterCompletion] Updated progress:', updatedProgress)
        setProgress(updatedProgress)

        // Enqueue for offline resilience
        enqueuePatch(patch)
        console.log('[ChapterCompletion] Patch enqueued to buffer')

        if (isAuthenticated) {
          // Immediate sync attempt only for authenticated users
          setSyncStatus('syncing')
          console.log('[ChapterCompletion] Starting sync (authenticated)...')
          try {
            const response = await patchProgress(patch)
            console.log('[ChapterCompletion] Sync response:', response)
            // Server authoritative
            setProgress(response.progress)
            setSyncStatus('idle')
            console.log('[ChapterCompletion] Sync successful ✅')
          } catch (error) {
            console.warn('[ChapterCompletion] Sync failed ❌, buffered for retry:', error)
            setSyncStatus('error')
          }
        } else {
          // Guest mode: no server sync, keep optimistic local progress
          setSyncStatus('idle')
          console.log('[ChapterCompletion] Guest mode - skipped server sync')
        }
      } catch (error) {
        console.error('[ChapterCompletion] Failed to process chapter completion:', error)
        setSyncStatus('error')
      }

      console.log('[ChapterCompletion] ===== END =====')
    },
    [progress, setProgress, setSyncStatus, isAuthenticated],
  )

  return { onChapterComplete }
}
