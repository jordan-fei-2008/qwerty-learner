/**
 * Learning Progress Integration API Client
 * Feature: 002-learning-progress-integration
 */
import { http } from '@/services/user/http'
import type { ProgressPatch, ProgressResponse, ReviewSessionResult, UserProgress } from '@/typings/progress'

const BASE_URL = '/progress'

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('authToken')
    if (!stored) return null
    // authTokenAtom stores the value directly or as JSON, try both
    try {
      return JSON.parse(stored)
    } catch {
      return stored
    }
  } catch {
    return null
  }
}

/**
 * Get current user progress
 */
export async function getProgress(): Promise<UserProgress> {
  const token = getAuthToken()
  const response = await http.get<UserProgress>(BASE_URL, { token: token || undefined })
  return response
}

/**
 * Patch progress incrementally (preferred method)
 * @param patch Incremental progress patch
 * @returns Server merged progress
 */
export async function patchProgress(patch: ProgressPatch): Promise<ProgressResponse> {
  const token = getAuthToken()

  // Transform frontend ProgressPatch to backend ProgressPatchRequest format
  // Backend expects: addMasteredWords, familiarityUpdates, addReviewQueue, removeReviewQueue
  // Frontend sends: masteredWords, familiarity, reviewQueueAdd, reviewQueueRemove
  const backendPatch: any = {
    schemaVersion: 1,
  }

  if (patch.masteredWords && patch.masteredWords.length > 0) {
    backendPatch.addMasteredWords = patch.masteredWords
  }

  if (patch.familiarity && Object.keys(patch.familiarity).length > 0) {
    backendPatch.familiarityUpdates = patch.familiarity
  }

  if (patch.reviewQueueAdd && patch.reviewQueueAdd.length > 0) {
    backendPatch.addReviewQueue = patch.reviewQueueAdd
  }

  if (patch.reviewQueueRemove && patch.reviewQueueRemove.length > 0) {
    backendPatch.removeReviewQueue = patch.reviewQueueRemove
  }

  if (patch.stats) {
    backendPatch.stats = patch.stats
  }

  if (patch.sessionPointer !== undefined) {
    backendPatch.sessionPointer = patch.sessionPointer
  }

  const response = await http.post<ProgressResponse>(`${BASE_URL}/patch`, backendPatch, { token: token || undefined })
  return response
}

/**
 * Replace progress (legacy full update)
 * @param progress Complete progress object
 * @returns Updated progress
 */
export async function putProgress(progress: UserProgress): Promise<UserProgress> {
  const token = getAuthToken()
  const response = await http.put<UserProgress>(BASE_URL, progress, { token: token || undefined })
  return response
}

/**
 * Submit review session results
 * @param results Review session results
 * @returns Server applied progress
 */
export async function submitReview(results: ReviewSessionResult): Promise<ProgressResponse> {
  const token = getAuthToken()
  const response = await http.post<ProgressResponse>(`${BASE_URL}/review/submit`, results, { token: token || undefined })
  return response
}

/**
 * Get review queue with familiarity subset
 */
export async function getReviewQueue(): Promise<{
  reviewQueue: string[]
  familiarity: Record<string, number>
  capacity: number
}> {
  const token = getAuthToken()
  const response = await http.get<{
    reviewQueue: string[]
    familiarity: Record<string, number>
    capacity: number
  }>(`${BASE_URL}/review/queue`, { token: token || undefined })
  return response
}

/**
 * Immediate sync trigger (optional convenience endpoint)
 */
export async function syncNow(): Promise<UserProgress> {
  const token = getAuthToken()
  const response = await http.post<UserProgress>(`${BASE_URL}/sync`, undefined, { token: token || undefined })
  return response
}
