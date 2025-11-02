/**
 * Date utility functions
 * Feature: 002-learning-progress-integration
 */

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * Uses local timezone
 */
export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if two dates are consecutive calendar days
 * @param previousDate ISO date string (YYYY-MM-DD)
 * @param currentDate ISO date string (YYYY-MM-DD)
 * @returns true if currentDate is exactly one day after previousDate
 */
export function isConsecutiveDay(previousDate: string, currentDate: string): boolean {
  const prev = new Date(previousDate)
  const curr = new Date(currentDate)

  // Calculate difference in days
  const diffTime = curr.getTime() - prev.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  return diffDays === 1
}

/**
 * Parse ISO date string to Date object
 * @param dateString ISO date string (YYYY-MM-DD)
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString)
}
