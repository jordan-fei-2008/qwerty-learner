// User progress data structure (version 1)
// NOTE: This file is deprecated. New code should use @/typings/progress instead.
// Kept for backward compatibility with API responses.
export interface UserProgress {
  masteredWords: string[]
  familiarity: Record<string, number>
  reviewQueue: string[] // Simplified from ReviewQueueItem[] to match new spec
  stats: LearningStats
  sessionPointer: SessionPointer | null
  archived: string[]
}

export interface ReviewQueueItem {
  word: string
  nextReviewAt: number // epoch millis
}

export interface LearningStats {
  totalLearned: number
  todayLearned: number
  streakDays: number
  lastLearnedDate?: string | null // Added for compatibility with new spec
}

export interface SessionPointer {
  wordsetId?: string // New field name
  wordset?: string // Old field name (deprecated)
  nextIndex: number
}

// API request/response types
export interface RegisterRequest {
  username: string
  email?: string
  password: string
  securityQuestion: string
  securityAnswer: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    username: string
    schemaVersion: number
    lastLoginAt: string
  }
  progress: UserProgress
}

export interface ProgressResponse {
  schemaVersion: number
  progress: UserProgress
  updatedAt: string
}

export interface ProgressUpdateRequest {
  schemaVersion: number
  progress: UserProgress
}
