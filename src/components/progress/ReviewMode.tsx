/**
 * Review Mode Component
 * Feature: 002-learning-progress-integration
 *
 * Basic review mode UI for practicing queued words
 */
import { Button } from '@/components/ui/button'
import { loadReviewQueue, submitReviewResults } from '@/services/progress/review'
import { progressAtom } from '@/state/progressAtoms'
import type { ReviewItemResult } from '@/typings/progress'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'

export function ReviewMode() {
  const [progress, setProgress] = useAtom(progressAtom)
  const [reviewWords, setReviewWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ReviewItemResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadQueue() {
      try {
        const { reviewQueue } = await loadReviewQueue()
        setReviewWords(reviewQueue)
        setIsLoading(false)
      } catch (error) {
        console.error('[ReviewMode] Failed to load queue:', error)
        setIsLoading(false)
      }
    }
    loadQueue()
  }, [])

  const handleWordComplete = (word: string, correct: number, mistakes: number) => {
    // Simple familiarity calculation: existing + correct - mistakes
    const existingFam = progress?.familiarity[word] || 0
    const finalFamiliarity = Math.max(0, Math.min(10, existingFam + correct - mistakes))

    const result: ReviewItemResult = {
      word,
      correctStreak: correct,
      mistakes,
      finalFamiliarity,
    }

    setResults((prev) => [...prev, result])

    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Finished all words, submit
      handleSubmitReview([...results, result])
    }
  }

  const handleSubmitReview = async (finalResults: ReviewItemResult[]) => {
    setIsSubmitting(true)
    try {
      await submitReviewResults(finalResults, progress, setProgress)
      alert('复习完成！')
      setCurrentIndex(0)
      setResults([])
      setReviewWords([])
    } catch (error) {
      console.error('[ReviewMode] Submit failed:', error)
      alert('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="p-4">加载复习队列中...</div>
  }

  if (reviewWords.length === 0) {
    return <div className="p-4">暂无需要复习的单词</div>
  }

  if (isSubmitting) {
    return <div className="p-4">提交中...</div>
  }

  const currentWord = reviewWords[currentIndex]

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="mb-4 text-2xl font-bold">复习模式</h2>
      <div className="mb-2 text-sm text-gray-500">
        {currentIndex + 1} / {reviewWords.length}
      </div>
      <div className="mb-8 text-4xl font-bold">{currentWord}</div>
      <div className="flex gap-4">
        <Button onClick={() => handleWordComplete(currentWord, 1, 0)}>正确</Button>
        <Button variant="secondary" onClick={() => handleWordComplete(currentWord, 0, 1)}>
          错误
        </Button>
      </div>
    </div>
  )
}
