/**
 * Session Pointer Management
 * Feature: 002-learning-progress-integration
 *
 * Handle session pointer updates with debouncing
 */
import { enqueuePatch } from './offlineBuffer'
import { POINTER_UPDATE_DEBOUNCE_MS } from '@/constants/progress'
import type { ProgressPatch, SessionPointer } from '@/typings/progress'

let debounceTimer: NodeJS.Timeout | null = null
let pendingPointer: SessionPointer | null = null

/**
 * Update session pointer with debouncing
 * Enqueues a pointer-only patch to offline buffer
 * @param pointer New session pointer
 */
export function updatePointer(pointer: SessionPointer | null): void {
  pendingPointer = pointer

  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Set new debounce timer
  debounceTimer = setTimeout(() => {
    if (pendingPointer !== null) {
      const patch: ProgressPatch = {
        sessionPointer: pendingPointer,
      }
      enqueuePatch(patch)
      console.log('[SessionPointer] Pointer enqueued:', pendingPointer)
    }
    pendingPointer = null
    debounceTimer = null
  }, POINTER_UPDATE_DEBOUNCE_MS)
}

/**
 * Flush pending pointer immediately (call on component unmount)
 */
export function flushPointer(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (pendingPointer !== null) {
    const patch: ProgressPatch = {
      sessionPointer: pendingPointer,
    }
    enqueuePatch(patch)
    console.log('[SessionPointer] Pointer flushed immediately:', pendingPointer)
    pendingPointer = null
  }
}

/**
 * Clear pointer state (on logout)
 */
export function clearPointerState(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pendingPointer = null
}
