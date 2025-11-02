/**
 * Learning Progress Integration Constants
 * Feature: 002-learning-progress-integration
 */

/**
 * Mastery threshold: familiarity >= 7 means mastered
 */
export const MASTERY_THRESHOLD = 7

/**
 * Review queue maximum capacity
 */
export const REVIEW_QUEUE_MAX = 1000

/**
 * LocalStorage key for offline buffer
 */
export const OFFLINE_BUFFER_KEY = 'progress_patch_buffer_v1'

/**
 * Familiarity increments
 */
export const FAMILIARITY_CORRECT_INCREMENT = 1
export const FAMILIARITY_ERROR_INCREMENT = 2
export const FAMILIARITY_MIN = 0
export const FAMILIARITY_MAX = 10

/**
 * Session pointer debounce interval (milliseconds)
 */
export const POINTER_UPDATE_DEBOUNCE_MS = 3000

/**
 * Number of words before triggering pointer update
 */
export const POINTER_UPDATE_WORD_INTERVAL = 15

/**
 * Maximum buffer size before truncation (bytes)
 */
export const MAX_BUFFER_SIZE_BYTES = 256 * 1024 // 256KB
