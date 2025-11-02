/**
 * Offline Buffer Management
 * Feature: 002-learning-progress-integration
 *
 * Persist and replay progress patches when offline
 */
import { coalescePatchQueue } from './merge'
import { MAX_BUFFER_SIZE_BYTES, OFFLINE_BUFFER_KEY } from '@/constants/progress'
import type { ProgressPatch } from '@/typings/progress'

/**
 * Enqueue a patch to the offline buffer
 */
export function enqueuePatch(patch: ProgressPatch): void {
  try {
    const queue = loadBuffer()
    queue.push(patch)
    saveBuffer(queue)
  } catch (error) {
    console.error('[OfflineBuffer] Failed to enqueue patch:', error)
  }
}

/**
 * Load patches from localStorage buffer
 */
export function loadBuffer(): ProgressPatch[] {
  try {
    const data = localStorage.getItem(OFFLINE_BUFFER_KEY)
    if (!data) {
      return []
    }
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) {
      console.warn('[OfflineBuffer] Invalid buffer format, resetting')
      return []
    }
    return parsed
  } catch (error) {
    console.warn('[OfflineBuffer] Corrupted buffer detected, purging:', error)
    clearBuffer()
    return []
  }
}

/**
 * Save patches to localStorage buffer
 */
function saveBuffer(queue: ProgressPatch[]): void {
  try {
    const serialized = JSON.stringify(queue)

    // Check size limit
    if (serialized.length > MAX_BUFFER_SIZE_BYTES) {
      console.warn('[OfflineBuffer] Buffer exceeds size limit, truncating oldest patches')
      // Keep only the newest half
      const truncated = queue.slice(Math.floor(queue.length / 2))
      localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(truncated))
    } else {
      localStorage.setItem(OFFLINE_BUFFER_KEY, serialized)
    }
  } catch (error) {
    console.error('[OfflineBuffer] Failed to save buffer:', error)
  }
}

/**
 * Clear the offline buffer
 */
export function clearBuffer(): void {
  try {
    localStorage.removeItem(OFFLINE_BUFFER_KEY)
  } catch (error) {
    console.error('[OfflineBuffer] Failed to clear buffer:', error)
  }
}

/**
 * Get coalesced patch from current buffer
 * Does not clear the buffer
 */
export function getCoalescedPatch(): ProgressPatch | null {
  const queue = loadBuffer()
  if (queue.length === 0) {
    return null
  }
  return coalescePatchQueue(queue)
}

/**
 * Get buffer size (number of patches)
 */
export function getBufferSize(): number {
  return loadBuffer().length
}

/**
 * Check if buffer has pending patches
 */
export function hasPendingPatches(): boolean {
  return getBufferSize() > 0
}

/**
 * Replay buffer: get coalesced patch and clear buffer on success callback
 * @returns Coalesced patch ready for submission, or null if empty
 */
export function prepareReplay(): {
  patch: ProgressPatch | null
  onSuccess: () => void
  onFailure: () => void
} {
  const patch = getCoalescedPatch()

  return {
    patch,
    onSuccess: () => {
      clearBuffer()
    },
    onFailure: () => {
      // Keep buffer intact for retry
      console.warn('[OfflineBuffer] Replay failed, buffer retained for retry')
    },
  }
}
