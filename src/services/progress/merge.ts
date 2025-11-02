/**
 * Progress Patch Merge Helpers
 * Feature: 002-learning-progress-integration
 *
 * Client-side optimistic merge and patch coalescing logic
 */
import { FAMILIARITY_MAX, FAMILIARITY_MIN, REVIEW_QUEUE_MAX } from '@/constants/progress'
import type { ProgressPatch, UserProgress } from '@/typings/progress'

/**
 * Apply a patch to local progress (optimistic update)
 * Merge semantics:
 * - masteredWords: union (dedupe, preserve order)
 * - familiarity: max(existing, incoming) clamped
 * - reviewQueue: union then apply removes, enforce capacity
 * - stats: replace with incoming
 * - sessionPointer: replace with incoming
 */
export function applyPatchToLocalProgress(current: UserProgress | null, patch: ProgressPatch): UserProgress {
  // Initialize empty progress if null
  const base: UserProgress = current || {
    masteredWords: [],
    familiarity: {},
    reviewQueue: [],
    stats: {
      totalLearned: 0,
      todayLearned: 0,
      streakDays: 0,
      lastLearnedDate: null,
    },
    sessionPointer: null,
  }

  // Deep clone to avoid mutation
  const merged: UserProgress = JSON.parse(JSON.stringify(base))

  // Ensure all required fields exist after clone (defensive programming)
  if (!merged.masteredWords) merged.masteredWords = []
  if (!merged.familiarity) merged.familiarity = {}
  if (!merged.reviewQueue) merged.reviewQueue = []
  if (!merged.stats) {
    merged.stats = {
      totalLearned: 0,
      todayLearned: 0,
      streakDays: 0,
      lastLearnedDate: null,
    }
  }

  // Merge masteredWords (union, dedupe)
  if (patch.masteredWords && patch.masteredWords.length > 0) {
    const existingSet = new Set(merged.masteredWords)
    for (const word of patch.masteredWords) {
      if (!existingSet.has(word)) {
        merged.masteredWords.push(word)
      }
    }
  }

  // Merge familiarity (max, clamp)
  if (patch.familiarity) {
    for (const [word, newFam] of Object.entries(patch.familiarity)) {
      const existingFam = merged.familiarity[word] || 0
      merged.familiarity[word] = Math.max(FAMILIARITY_MIN, Math.min(FAMILIARITY_MAX, Math.max(existingFam, newFam)))
    }
  }

  // Merge reviewQueue: add then remove
  if (patch.reviewQueueAdd && patch.reviewQueueAdd.length > 0) {
    const queueSet = new Set(merged.reviewQueue)
    for (const word of patch.reviewQueueAdd) {
      if (!queueSet.has(word) && merged.reviewQueue.length < REVIEW_QUEUE_MAX) {
        merged.reviewQueue.push(word)
        queueSet.add(word)
      }
    }
  }

  if (patch.reviewQueueRemove && patch.reviewQueueRemove.length > 0) {
    const removeSet = new Set(patch.reviewQueueRemove)
    merged.reviewQueue = merged.reviewQueue.filter((word) => !removeSet.has(word))
  }

  // Merge stats (replace with patch values if present)
  if (patch.stats) {
    merged.stats = {
      ...merged.stats,
      ...patch.stats,
    }
  }

  // Update totalLearned to match masteredWords length (consistency check)
  merged.stats.totalLearned = merged.masteredWords.length

  // Replace sessionPointer
  if (patch.sessionPointer !== undefined) {
    merged.sessionPointer = patch.sessionPointer
  }

  return merged
}

/**
 * Coalesce multiple patches into a single merged patch
 * Used for offline buffer replay
 */
export function coalescePatchQueue(patches: ProgressPatch[]): ProgressPatch {
  if (patches.length === 0) {
    return {}
  }

  if (patches.length === 1) {
    return patches[0]
  }

  const coalesced: ProgressPatch = {}

  // Collect all masteredWords (dedupe)
  const masteredSet = new Set<string>()
  for (const patch of patches) {
    if (patch.masteredWords) {
      for (const word of patch.masteredWords) {
        masteredSet.add(word)
      }
    }
  }
  if (masteredSet.size > 0) {
    coalesced.masteredWords = Array.from(masteredSet)
  }

  // Merge familiarity (max across all patches, clamp)
  const familiarityMap: Record<string, number> = {}
  for (const patch of patches) {
    if (patch.familiarity) {
      for (const [word, fam] of Object.entries(patch.familiarity)) {
        const existing = familiarityMap[word] || 0
        familiarityMap[word] = Math.max(existing, fam)
      }
    }
  }
  if (Object.keys(familiarityMap).length > 0) {
    // Clamp all values
    for (const word of Object.keys(familiarityMap)) {
      familiarityMap[word] = Math.max(FAMILIARITY_MIN, Math.min(FAMILIARITY_MAX, familiarityMap[word]))
    }
    coalesced.familiarity = familiarityMap
  }

  // Collect reviewQueue adds/removes
  const addSet = new Set<string>()
  const removeSet = new Set<string>()
  for (const patch of patches) {
    if (patch.reviewQueueAdd) {
      for (const word of patch.reviewQueueAdd) {
        addSet.add(word)
      }
    }
    if (patch.reviewQueueRemove) {
      for (const word of patch.reviewQueueRemove) {
        removeSet.add(word)
      }
    }
  }
  // Remove from add if also in remove
  removeSet.forEach((word) => {
    addSet.delete(word)
  })

  if (addSet.size > 0) {
    coalesced.reviewQueueAdd = Array.from(addSet)
  }
  if (removeSet.size > 0) {
    coalesced.reviewQueueRemove = Array.from(removeSet)
  }

  // Use latest stats (from last patch)
  for (let i = patches.length - 1; i >= 0; i--) {
    if (patches[i].stats) {
      coalesced.stats = patches[i].stats
      break
    }
  }

  // Use latest sessionPointer
  for (let i = patches.length - 1; i >= 0; i--) {
    if (patches[i].sessionPointer !== undefined) {
      coalesced.sessionPointer = patches[i].sessionPointer
      break
    }
  }

  return coalesced
}
