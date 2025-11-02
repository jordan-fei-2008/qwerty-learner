/**
 * Review Service
 * Feature: 002-learning-progress-integration
 *
 * Handle review queue operations
 */
import { getReviewQueue, submitReview as submitReviewApi } from './api'
import { applyPatchToLocalProgress } from './merge'
import { enqueuePatch } from './offlineBuffer'
import { buildReviewPatch } from './patchBuilder'
import type { ReviewItemResult, ReviewSessionResult, UserProgress } from '@/typings/progress'

/**
 * Load review queue for starting a review session
 * @returns Review queue words with familiarity
 */
export async function loadReviewQueue(): Promise<{
  reviewQueue: string[]
  familiarity: Record<string, number>
}> {
  const response = await getReviewQueue()
  return {
    reviewQueue: response.reviewQueue,
    familiarity: response.familiarity,
  }
}

/**
 * Submit review session results and update progress
 * @param items Review item results
 * @param currentProgress Current progress state
 * @param setProgress Callback to update progress atom
 */
export async function submitReviewResults(
  items: ReviewItemResult[],
  currentProgress: UserProgress | null,
  setProgress: (progress: UserProgress) => void,
): Promise<void> {
  try {
    // Build patch from review results
    const reviewPatch = buildReviewPatch(
      items.map((item) => ({
        word: item.word,
        finalFamiliarity: item.finalFamiliarity,
      })),
      currentProgress,
    )

    // Apply optimistically
    const updatedProgress = applyPatchToLocalProgress(currentProgress, reviewPatch)
    setProgress(updatedProgress)

    // Enqueue for offline resilience
    enqueuePatch(reviewPatch)

    // Submit to server
    const sessionResult: ReviewSessionResult = {
      items,
      completedAt: new Date().toISOString(),
    }

    try {
      const response = await submitReviewApi(sessionResult)
      // Server is authoritative
      setProgress(response.progress)
      console.log('[Review] Submission successful')
    } catch (error) {
      console.warn('[Review] Submission failed, buffered for retry:', error)
      // Optimistic update remains
    }
  } catch (error) {
    console.error('[Review] Failed to process review results:', error)
  }
}
