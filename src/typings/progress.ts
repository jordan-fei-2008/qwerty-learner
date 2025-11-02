/**
 * Learning Progress Integration Types
 * Feature: 002-learning-progress-integration
 */

/**
 * Session pointer for resume functionality
 */
export interface SessionPointer {
  wordsetId: string // Dictionary + chapter composite identifier
  nextIndex: number // Index of next word to learn (0-based)
}

/**
 * User progress statistics
 */
export interface ProgressStats {
  totalLearned: number // Count of unique mastered words
  todayLearned: number // New words mastered today
  streakDays: number // Consecutive days with ≥1 new mastery
  lastLearnedDate: string | null // ISO date (YYYY-MM-DD)
}

/**
 * Complete user progress (persisted aggregate)
 */
export interface UserProgress {
  masteredWords: string[] // All globally mastered words (chronological)
  familiarity: Record<string, number> // Per-word familiarity level (0-10)
  reviewQueue: string[] // FIFO review queue (max 1000, unique)
  stats: ProgressStats
  sessionPointer: SessionPointer | null
  archived?: string[] // Reserved for future use
}

/**
 * Incremental progress patch (transient client payload)
 */
export interface ProgressPatch {
  masteredWords?: string[] // New mastered words to add
  familiarity?: Record<string, number> // Absolute familiarity values
  reviewQueueAdd?: string[] // Words to add to review queue
  reviewQueueRemove?: string[] // Words to remove from review queue
  stats?: Partial<ProgressStats> // Updated stats
  sessionPointer?: SessionPointer | null // Updated pointer
}

/**
 * Review item result
 */
export interface ReviewItemResult {
  word: string
  correctStreak: number // Continuous correct answers in session
  mistakes: number
  finalFamiliarity: number // Proposed familiarity after review
}

/**
 * Review session result
 */
export interface ReviewSessionResult {
  items: ReviewItemResult[]
  completedAt: string // ISO timestamp
}

/**
 * Word outcome in a chapter
 */
export interface WordOutcome {
  word: string
  correct: number // Correct count
  errors: number // Error count
}

/**
 * Chapter completion result
 */
export interface ChapterResult {
  wordsetId: string // Chapter/dictionary composite ID
  words: WordOutcome[]
  nextPointer: SessionPointer | null // Pointer after chapter completion
}

/**
 * API response for progress operations
 */
export interface ProgressResponse {
  status: 'merged' | 'applied' | 'success'
  progress: UserProgress
}
