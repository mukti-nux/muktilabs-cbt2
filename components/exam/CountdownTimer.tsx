'use client'
import { useState, useEffect, useCallback } from 'react'

interface CountdownTimerProps {
  duration: number // in seconds
  onTimeUp?: () => void
  onTick?: (remaining: number) => void
  size?: 'sm' | 'md' | 'lg'
  showWarning?: boolean
  warningThreshold?: number // seconds
}

export default function CountdownTimer({
  duration,
  onTimeUp,
  onTick,
  size = 'md',
  showWarning = true,
  warningThreshold = 60,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    setTimeLeft(duration)
    setIsRunning(true)
  }, [duration])

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1
        if (onTick) onTick(newTime)
        
        if (newTime <= 0) {
          clearInterval(timer)
          if (onTimeUp) onTimeUp()
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, timeLeft, onTimeUp, onTick])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const pause = () => setIsRunning(false)
  const resume = () => setIsRunning(true)
  const reset = () => {
    setTimeLeft(duration)
    setIsRunning(true)
  }

  const isWarning = showWarning && timeLeft <= warningThreshold && timeLeft > 0
  const isCritical = showWarning && timeLeft <= 10 && timeLeft > 0
  const isTimeUp = timeLeft <= 0

  const sizeClasses = {
    sm: 'text-lg px-3 py-1',
    md: 'text-2xl px-5 py-2',
    lg: 'text-4xl px-8 py-3',
  }

  const getColorClass = () => {
    if (isTimeUp) return 'bg-red-500 text-white'
    if (isCritical) return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
    if (isWarning) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    return 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          rounded-xl font-bold tracking-wider transition-all duration-300
          ${sizeClasses[size]}
          ${getColorClass()}
        `}
      >
        {isTimeUp ? "TIME'S UP!" : formatTime(timeLeft)}
      </div>
      
      <div className="flex gap-1">
        {isRunning ? (
          <button
            onClick={pause}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Pause timer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={resume}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Resume timer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button
          onClick={reset}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="Reset timer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {isWarning && !isCritical && (
        <span className="text-xs text-amber-500 animate-pulse">
          ⚠️ Waktu hampir habis!
        </span>
      )}
      {isCritical && (
        <span className="text-xs text-red-500 font-bold animate-pulse">
          🚨 Segera selesaikan!
        </span>
      )}
    </div>
  )
}
