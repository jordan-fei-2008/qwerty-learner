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
import type { ChapterResult } from '@/typings/progress'
import { useAtom } from 'jotai'
import { useCallback } from 'react'

/**
 * Hook for handling chapter completion
 * @returns onChapterComplete callback
 */
export function useChapterCompletion() {
  const [progress, setProgress] = useAtom(progressAtom)
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

        // Immediate sync attempt
        setSyncStatus('syncing')
        console.log('[ChapterCompletion] Starting sync...')

        try {
          const response = await patchProgress(patch)
          console.log('[ChapterCompletion] Sync response:', response)
          // Server is authoritative: replace local with server response
          setProgress(response.progress)
          setSyncStatus('idle')

          // Clear buffer on success (handled by progressSync orchestrator)
          console.log('[ChapterCompletion] Sync successful ✅')
        } catch (error) {
          // Network/server error: keep buffer intact
          console.warn('[ChapterCompletion] Sync failed ❌, buffered for retry:', error)
          setSyncStatus('error')
          // Optimistic update remains; will retry on next trigger or manual sync
        }
      } catch (error) {
        console.error('[ChapterCompletion] Failed to process chapter completion:', error)
        setSyncStatus('error')
      }

      console.log('[ChapterCompletion] ===== END =====')
    },
    [progress, setProgress, setSyncStatus],
  )

  return { onChapterComplete }
}
