/**
 * Learning Progress Patch Builder
 * Feature: 002-learning-progress-integration
 *
 * Core logic for building ProgressPatch from chapter results
 */
import {
  FAMILIARITY_CORRECT_INCREMENT,
  FAMILIARITY_ERROR_INCREMENT,
  FAMILIARITY_MAX,
  FAMILIARITY_MIN,
  MASTERY_THRESHOLD,
  REVIEW_QUEUE_MAX,
} from '@/constants/progress'
import type { ChapterResult, ProgressPatch, UserProgress, WordOutcome } from '@/typings/progress'
import { getTodayDateString, isConsecutiveDay } from '@/utils/date'

/**
 * Build a progress patch from chapter completion result
 * @param chapterResult Chapter completion data
 * @param currentProgress Current progress state (for stats continuity)
 * @returns ProgressPatch to submit
 */
export function buildChapterPatch(chapterResult: ChapterResult, currentProgress: UserProgress | null): ProgressPatch {
  const { words, nextPointer } = chapterResult

  // Empty chapter edge case
  if (!words || words.length === 0) {
    return {
      sessionPointer: nextPointer,
    }
  }

  const masteredWords: string[] = []
  const familiarity: Record<string, number> = {}
  const reviewQueueAdd: string[] = []
  const reviewQueueRemove: string[] = []

  const currentFamiliarity = currentProgress?.familiarity || {}
  const currentMastered = new Set(currentProgress?.masteredWords || [])
  const currentQueue = new Set(currentProgress?.reviewQueue || [])

  // Process each word outcome
  for (const wordOutcome of words) {
    const { word, correct, errors } = wordOutcome
    const existingFam = currentFamiliarity[word] || 0

    // Calculate new familiarity: correct +1, error +2, clamp [0,10]
    let newFam = existingFam + correct * FAMILIARITY_CORRECT_INCREMENT + errors * FAMILIARITY_ERROR_INCREMENT
    newFam = Math.max(FAMILIARITY_MIN, Math.min(FAMILIARITY_MAX, newFam))

    familiarity[word] = newFam

    // Mastery detection: familiarity >= 7
    if (newFam >= MASTERY_THRESHOLD && !currentMastered.has(word)) {
      masteredWords.push(word)
      // Remove from review queue if present
      if (currentQueue.has(word)) {
        reviewQueueRemove.push(word)
      }
    }

    // Error words go to review queue (if not mastered)
    if (errors > 0 && newFam < MASTERY_THRESHOLD && !currentQueue.has(word)) {
      reviewQueueAdd.push(word)
    }
  }

  // Calculate stats updates
  const statsUpdate = calculateStatsUpdate(masteredWords.length, currentProgress)

  return {
    masteredWords: masteredWords.length > 0 ? masteredWords : undefined,
    familiarity: Object.keys(familiarity).length > 0 ? familiarity : undefined,
    reviewQueueAdd: reviewQueueAdd.length > 0 ? reviewQueueAdd : undefined,
    reviewQueueRemove: reviewQueueRemove.length > 0 ? reviewQueueRemove : undefined,
    stats: statsUpdate,
    sessionPointer: nextPointer,
  }
}

/**
 * Calculate stats update for new mastered words
 */
function calculateStatsUpdate(newMasteredCount: number, currentProgress: UserProgress | null): ProgressPatch['stats'] | undefined {
  if (newMasteredCount === 0) {
    return undefined
  }

  const today = getTodayDateString()
  const lastDate = currentProgress?.stats?.lastLearnedDate || null
  const currentStreak = currentProgress?.stats?.streakDays || 0
  const currentTodayLearned = currentProgress?.stats?.todayLearned || 0

  // Day boundary logic
  const isNewDay = lastDate !== today
  const isConsecutive = lastDate ? isConsecutiveDay(lastDate, today) : true

  let todayLearned = currentTodayLearned + newMasteredCount
  let streakDays = currentStreak

  if (isNewDay) {
    // Reset todayLearned on new day
    todayLearned = newMasteredCount
    // Update streak
    if (isConsecutive) {
      streakDays = currentStreak + 1
    } else {
      streakDays = 1
    }
  }

  return {
    todayLearned,
    streakDays,
    lastLearnedDate: today,
  }
}

/**
 * Build patch for review session results
 */
export function buildReviewPatch(
  items: Array<{ word: string; finalFamiliarity: number }>,
  currentProgress: UserProgress | null,
): ProgressPatch {
  const familiarity: Record<string, number> = {}
  const masteredWords: string[] = []
  const reviewQueueRemove: string[] = []

  const currentMastered = new Set(currentProgress?.masteredWords || [])
  const currentQueue = new Set(currentProgress?.reviewQueue || [])

  for (const item of items) {
    const { word, finalFamiliarity } = item
    const clampedFam = Math.max(FAMILIARITY_MIN, Math.min(FAMILIARITY_MAX, finalFamiliarity))
    familiarity[word] = clampedFam

    // Mastery check
    if (clampedFam >= MASTERY_THRESHOLD) {
      if (!currentMastered.has(word)) {
        masteredWords.push(word)
      }
      if (currentQueue.has(word)) {
        reviewQueueRemove.push(word)
      }
    }
  }

  const statsUpdate = calculateStatsUpdate(masteredWords.length, currentProgress)

  return {
    familiarity: Object.keys(familiarity).length > 0 ? familiarity : undefined,
    masteredWords: masteredWords.length > 0 ? masteredWords : undefined,
    reviewQueueRemove: reviewQueueRemove.length > 0 ? reviewQueueRemove : undefined,
    stats: statsUpdate,
  }
}

/**
 * Enforce review queue capacity constraints
 * @param addWords Words to add
 * @param currentQueue Current queue
 * @returns Words to actually add (truncated if needed)
 */
export function enforceReviewQueueCapacity(addWords: string[], currentQueue: string[]): string[] {
  const availableSlots = REVIEW_QUEUE_MAX - currentQueue.length
  if (availableSlots <= 0) {
    return []
  }
  if (addWords.length <= availableSlots) {
    return addWords
  }
  // Truncate overflow
  return addWords.slice(0, availableSlots)
}
