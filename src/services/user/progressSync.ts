import { http } from './http'
import type { UserProgress } from '@/typings/userProgress'

// Progress update response from server
export interface ProgressUpdateRequest {
  schemaVersion: number
  progress: UserProgress
}

export interface ProgressResponse {
  schemaVersion: number
  progress: UserProgress
  updatedAt: string
}

// Sync configuration
const DEBOUNCE_MS = 3000 // 3 seconds
const MAX_BUFFER_SIZE = 10 // Max pending updates before force flush
const OFFLINE_BUFFER_KEY = 'qwerty_offline_progress_buffer' // localStorage key

// Module state
let operationBuffer: Partial<UserProgress>[] = []
let debounceTimer: NodeJS.Timeout | null = null
let isFlushing = false
let currentToken: string | null = null

// Callbacks for UI updates
let onSyncStart: (() => void) | null = null
let onSyncSuccess: ((response: ProgressResponse) => void) | null = null
let onSyncError: ((error: Error) => void) | null = null
let onBufferChange: ((count: number) => void) | null = null

/**
 * Initialize sync service with auth token
 */
export function initProgressSync(token: string) {
  currentToken = token
  // Restore offline buffer from localStorage
  restoreOfflineBuffer()
}

/**
 * Clear sync state (on logout)
 */
export function clearProgressSync() {
  currentToken = null
  operationBuffer = []
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  isFlushing = false
  // Clear offline buffer from localStorage
  clearOfflineBuffer()
}

/**
 * Set callbacks for sync events
 */
export function setSyncCallbacks(callbacks: {
  onSyncStart?: () => void
  onSyncSuccess?: (response: ProgressResponse) => void
  onSyncError?: (error: Error) => void
  onBufferChange?: (count: number) => void
}) {
  onSyncStart = callbacks.onSyncStart || null
  onSyncSuccess = callbacks.onSyncSuccess || null
  onSyncError = callbacks.onSyncError || null
  onBufferChange = callbacks.onBufferChange || null
}

/**
 * Queue a progress update (will be debounced and batched)
 */
export function queueProgressUpdate(update: Partial<UserProgress>) {
  if (!currentToken) {
    console.warn('Cannot queue progress update: not authenticated')
    return
  }

  operationBuffer.push(update)
  onBufferChange?.(operationBuffer.length)

  // Persist to localStorage for offline support
  saveOfflineBuffer()

  // Force flush if buffer is full
  if (operationBuffer.length >= MAX_BUFFER_SIZE) {
    void flushUpdates()
    return
  }

  // Reset debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    void flushUpdates()
  }, DEBOUNCE_MS)
}

/**
 * Immediately flush all pending updates
 */
export async function syncNow(): Promise<ProgressResponse | null> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  return flushUpdates()
}

/**
 * Flush pending updates to server
 */
async function flushUpdates(): Promise<ProgressResponse | null> {
  if (isFlushing || operationBuffer.length === 0) {
    return null
  }

  if (!currentToken) {
    console.error('Cannot flush updates: not authenticated')
    return null
  }

  isFlushing = true
  onSyncStart?.()

  try {
    // Merge all pending updates into one
    const mergedProgress = mergeProgressUpdates(operationBuffer)

    // Send to server
    const response = await http.put<ProgressResponse>(
      '/progress',
      {
        schemaVersion: 1, // Current schema version
        progress: mergedProgress,
      },
      {
        token: currentToken,
      },
    )

    // Clear buffer on success
    operationBuffer = []
    onBufferChange?.(0)
    onSyncSuccess?.(response)

    // Clear offline buffer from localStorage
    clearOfflineBuffer()

    return response
  } catch (error) {
    console.error('Failed to sync progress:', error)
    onSyncError?.(error as Error)
    // Keep buffer in localStorage for retry
    return null
  } finally {
    isFlushing = false
  }
}

/**
 * Merge multiple partial progress updates into one complete update
 */
function mergeProgressUpdates(updates: Partial<UserProgress>[]): UserProgress {
  // Start with default structure
  const merged: UserProgress = {
    masteredWords: [],
    familiarity: {},
    reviewQueue: [],
    stats: {
      totalLearned: 0,
      todayLearned: 0,
      streakDays: 0,
    },
    sessionPointer: null,
    archived: [],
  }

  // Apply each update in order
  for (const update of updates) {
    if (update.masteredWords !== undefined) {
      merged.masteredWords = update.masteredWords
    }
    if (update.familiarity !== undefined) {
      merged.familiarity = { ...merged.familiarity, ...update.familiarity }
    }
    if (update.reviewQueue !== undefined) {
      merged.reviewQueue = update.reviewQueue
    }
    if (update.stats !== undefined) {
      merged.stats = { ...merged.stats, ...update.stats }
    }
    if (update.sessionPointer !== undefined) {
      merged.sessionPointer = update.sessionPointer
    }
    if (update.archived !== undefined) {
      merged.archived = update.archived
    }
  }

  return merged
}

/**
 * Get pending operations count
 */
export function getPendingCount(): number {
  return operationBuffer.length
}

/**
 * Check if sync is in progress
 */
export function isSyncing(): boolean {
  return isFlushing
}

/**
 * Save operation buffer to localStorage for offline support
 */
function saveOfflineBuffer() {
  try {
    if (operationBuffer.length > 0) {
      localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(operationBuffer))
    } else {
      localStorage.removeItem(OFFLINE_BUFFER_KEY)
    }
  } catch (error) {
    console.error('Failed to save offline buffer:', error)
  }
}

/**
 * Restore operation buffer from localStorage
 */
function restoreOfflineBuffer() {
  try {
    const stored = localStorage.getItem(OFFLINE_BUFFER_KEY)
    if (stored) {
      const restored = JSON.parse(stored) as Partial<UserProgress>[]
      if (Array.isArray(restored) && restored.length > 0) {
        operationBuffer = restored
        onBufferChange?.(operationBuffer.length)
        console.log(`Restored ${restored.length} offline operations`)

        // Try to sync immediately
        void flushUpdates()
      }
    }
  } catch (error) {
    console.error('Failed to restore offline buffer:', error)
    // Clear corrupted data
    localStorage.removeItem(OFFLINE_BUFFER_KEY)
  }
}

/**
 * Clear offline buffer from localStorage
 */
function clearOfflineBuffer() {
  try {
    localStorage.removeItem(OFFLINE_BUFFER_KEY)
  } catch (error) {
    console.error('Failed to clear offline buffer:', error)
  }
}

/**
 * Check if there are offline operations in localStorage
 */
export function hasOfflineOperations(): boolean {
  try {
    const stored = localStorage.getItem(OFFLINE_BUFFER_KEY)
    if (stored) {
      const restored = JSON.parse(stored) as Partial<UserProgress>[]
      return Array.isArray(restored) && restored.length > 0
    }
  } catch (error) {
    console.error('Failed to check offline operations:', error)
  }
  return false
}
