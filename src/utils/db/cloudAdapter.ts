/**
 * IndexedDB API Adapter
 * Redirects IndexedDB calls to backend API for cloud storage
 * This allows existing code to work without changes while data is stored in the cloud
 */
import { http } from '@/services/user/http'

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('authToken')
    if (!stored) return null
    // atomWithStorage stores the value directly or as JSON, try both
    try {
      return JSON.parse(stored)
    } catch {
      return stored
    }
  } catch {
    return null
  }
}

/**
 * Add word record to cloud storage (replaces IndexedDB)
 */
export async function addWordRecord(record: { word: string; [key: string]: unknown }): Promise<number> {
  const token = getAuthToken()
  if (!token) {
    console.warn('[DBAdapter] No auth token, skipping cloud storage')
    return 0
  }

  try {
    await http.post('/progress/word-records', record, { token })
    console.log('[DBAdapter] Word record saved to cloud:', record.word)
    return Date.now() // Return a mock ID
  } catch (error) {
    console.error('[DBAdapter] Failed to save word record to cloud:', error)
    throw error
  }
}

/**
 * Get word records by time range (replaces IndexedDB query)
 */
export async function getWordRecordsByTimeRange(
  startTime: number,
  endTime: number,
): Promise<Array<{ word: string; wrongCount: number; [key: string]: unknown }>> {
  const token = getAuthToken()
  if (!token) {
    console.warn('[DBAdapter] No auth token, returning empty results')
    return []
  }

  try {
    const records = await http.get<Array<{ word: string; wrongCount: number; [key: string]: unknown }>>(
      `/progress/word-records?startTime=${startTime}&endTime=${endTime}`,
      { token },
    )
    console.log('[DBAdapter] Retrieved', records.length, 'word records from cloud')
    return records
  } catch (error) {
    console.error('[DBAdapter] Failed to get word records from cloud:', error)
    return []
  }
}

/**
 * Get all word records (replaces IndexedDB.toArray())
 */
export async function getAllWordRecords(): Promise<Array<{ word: string; wrongCount: number; [key: string]: unknown }>> {
  const token = getAuthToken()
  if (!token) {
    console.warn('[DBAdapter] No auth token, returning empty results')
    return []
  }

  try {
    const records = await http.get<Array<{ word: string; wrongCount: number; [key: string]: unknown }>>('/progress/word-records', { token })
    console.log('[DBAdapter] Retrieved', records.length, 'word records from cloud')
    return records
  } catch (error) {
    console.error('[DBAdapter] Failed to get all word records from cloud:', error)
    return []
  }
}

/**
 * Get error word records (wrongCount > 0) for ErrorBook page
 */
export async function getErrorWordRecords(): Promise<Array<{ word: string; wrongCount: number; [key: string]: unknown }>> {
  const token = getAuthToken()
  if (!token) {
    console.warn('[DBAdapter] No auth token, returning empty results')
    return []
  }

  try {
    const records = await http.get<Array<{ word: string; wrongCount: number; [key: string]: unknown }>>('/progress/word-records', { token })
    // Filter records with wrongCount > 0
    const errorRecords = records.filter((record) => record.wrongCount > 0)
    console.log('[DBAdapter] Retrieved', errorRecords.length, 'error word records from cloud')
    return errorRecords
  } catch (error) {
    console.error('[DBAdapter] Failed to get error word records from cloud:', error)
    return []
  }
}

/**
 * Delete word records by word and dict
 * @param word Word to delete
 * @param dict Dictionary name
 * @returns Number of records deleted
 */
export async function deleteWordRecords(word: string, dict: string): Promise<number> {
  const token = getAuthToken()
  if (!token) {
    console.warn('[DBAdapter] No auth token, skipping cloud deletion')
    return 0
  }

  try {
    const response = await http.delete<{ deletedCount: number }>(
      `/progress/word-records?word=${encodeURIComponent(word)}&dict=${encodeURIComponent(dict)}`,
      { token },
    )
    console.log('[DBAdapter] Deleted', response.deletedCount, 'word records from cloud')
    return response.deletedCount
  } catch (error) {
    console.error('[DBAdapter] Failed to delete word records from cloud:', error)
    throw error
  }
}
