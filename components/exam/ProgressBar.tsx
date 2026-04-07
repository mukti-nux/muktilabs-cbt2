'use client'
import { useEffect, useState } from 'react'

interface ProgressBarProps {
  current: number
  total: number
  showLabel?: boolean
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'gradient'
}

export default function ProgressBar({
  current,
  total,
  showLabel = true,
  animated = true,
  size = 'md',
  variant = 'gradient',
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0)
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  useEffect(() => {
    if (animated) {
      // Animate progress
      const timer = setTimeout(() => {
        setProgress(percentage)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setProgress(percentage)
    }
  }, [percentage, animated])

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const variantClasses = {
    default: 'bg-violet-600',
    success: 'bg-green-500',
    gradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-500',
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Progress
          </span>
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
            {current}/{total}
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${variantClasses[variant]} rounded-full transition-all duration-500 ease-out ${
            animated ? 'transform origin-left' : ''
          }`}
          style={{ 
            width: `${progress}%`,
            transform: animated ? `scaleX(${progress / 100})` : undefined,
          }}
        />
      </div>
      {showLabel && (
        <div className="text-right mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {percentage}% complete
          </span>
        </div>
      )}
    </div>
  )
}
