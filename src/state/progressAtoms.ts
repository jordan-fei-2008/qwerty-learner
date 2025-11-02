/**
 * Learning Progress Integration State Atoms
 * Feature: 002-learning-progress-integration
 */
import type { ProgressPatch, UserProgress } from '@/typings/progress'
import { atom } from 'jotai'

/**
 * Current user progress (hydrated from server)
 */
export const progressAtom = atom<UserProgress | null>(null)

/**
 * Pending patches queue (offline buffer)
 */
export const pendingPatchesAtom = atom<ProgressPatch[]>([])

/**
 * Offline/online status
 */
export const offlineStatusAtom = atom<'online' | 'offline'>('online')

/**
 * Sync status indicator
 */
export const syncStatusAtom = atom<'idle' | 'syncing' | 'error' | 'offline'>('idle')

/**
 * Derived: count of pending patches
 */
export const pendingCountAtom = atom((get) => get(pendingPatchesAtom).length)

/**
 * Derived: has pending patches
 */
export const hasPendingPatchesAtom = atom((get) => get(pendingPatchesAtom).length > 0)
