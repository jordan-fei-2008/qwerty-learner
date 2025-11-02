/**
 * T078: Loading state component
 *
 * Reusable loading indicator for async operations
 */
import type React from 'react'

interface LoadingIndicatorProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Optional text to display below spinner */
  text?: string
  /** Full screen overlay mode */
  fullScreen?: boolean
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ size = 'md', text, fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`
          ${sizeClasses[size]}
          animate-spin 
          rounded-full 
          border-gray-300 
          border-t-blue-500
        `}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">{spinner}</div>
  }

  return spinner
}

/** Skeleton loading placeholder */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}
