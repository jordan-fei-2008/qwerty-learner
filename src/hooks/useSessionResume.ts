import { useProgressSync } from './useProgressSync'
import { clearSessionPointer, getSessionPointer, hasSessionToResume, updateSessionPointer } from '@/services/user/sessionResume'
import { progressAtom } from '@/store/authSlice'
import type { SessionPointer } from '@/typings/userProgress'
import { useAtom } from 'jotai'

export function useSessionResume() {
  const [progress, setProgress] = useAtom(progressAtom)
  const { syncProgress } = useProgressSync()

  /**
   * Update session pointer and sync to server
   */
  const saveSessionPointer = (wordset: string, nextIndex: number) => {
    const updatedProgress = updateSessionPointer(progress, wordset, nextIndex)
    setProgress(updatedProgress)
    // Queue sync to server
    syncProgress(updatedProgress)
  }

  /**
   * Clear session pointer and sync to server
   */
  const clearSession = () => {
    const updatedProgress = clearSessionPointer(progress)
    setProgress(updatedProgress)
    syncProgress(updatedProgress)
  }

  /**
   * Get current session pointer
   */
  const currentSession = (): SessionPointer | null => {
    return getSessionPointer(progress)
  }

  /**
   * Check if there's a session to resume
   */
  const canResume = (): boolean => {
    return hasSessionToResume(progress)
  }

  return {
    saveSessionPointer,
    clearSession,
    currentSession,
    canResume,
  }
}
