import type { SessionPointer, UserProgress } from '@/typings/userProgress'

/**
 * Session resume service - handles session pointer for cross-device learning continuity
 */

/**
 * Update session pointer in progress
 */
export function updateSessionPointer(progress: UserProgress, wordset: string, nextIndex: number): UserProgress {
  return {
    ...progress,
    sessionPointer: {
      wordset,
      nextIndex,
    },
  }
}

/**
 * Clear session pointer (e.g., when completing a wordset)
 */
export function clearSessionPointer(progress: UserProgress): UserProgress {
  return {
    ...progress,
    sessionPointer: null,
  }
}

/**
 * Get current session pointer
 */
export function getSessionPointer(progress: UserProgress): SessionPointer | null {
  return progress.sessionPointer
}

/**
 * Check if there's a valid session to resume
 */
export function hasSessionToResume(progress: UserProgress): boolean {
  const pointer = progress.sessionPointer
  return pointer !== null && pointer.wordset.length > 0 && pointer.nextIndex >= 0
}

/**
 * Format session pointer for display
 */
export function formatSessionPointer(pointer: SessionPointer | null): string {
  if (!pointer) {
    return '无断点'
  }
  return `词库: ${pointer.wordset}, 位置: ${pointer.nextIndex}`
}
