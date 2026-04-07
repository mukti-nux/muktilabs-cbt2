'use client'
import { useEffect, useState } from 'react'
import { celebrate } from './Confetti'

interface StreakCounterProps {
  streak: number
  showAnimation?: boolean
}

export default function StreakCounter({ streak, showAnimation = true }: StreakCounterProps) {
  const [showFire, setShowFire] = useState(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (streak >= 3 && showAnimation) {
      setShowFire(true)
      
      // Trigger animation
      setAnimate(true)
      setTimeout(() => setAnimate(false), 500)
      
      // Fire confetti on milestone streaks
      if (streak === 3 || streak === 5 || streak === 10 || streak % 10 === 0) {
        celebrate('quick')
      }
    }
  }, [streak, showAnimation])

  if (streak < 2) return null

  const getStreakEmoji = () => {
    if (streak >= 10) return '🔥🔥🔥'
    if (streak >= 5) return '🔥🔥'
    return '🔥'
  }

  const getStreakLabel = () => {
    if (streak >= 10) return 'LEGENDARY!'
    if (streak >= 5) return 'ON FIRE!'
    if (streak >= 3) return 'HOT STREAK!'
    return ''
  }

  return (
    <div className={`flex items-center gap-2 transition-all duration-300 ${animate ? 'scale-125' : 'scale-100'}`}>
      <div className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-gradient-to-r from-orange-500 to-amber-500
        text-white text-sm font-bold shadow-lg
        ${animate ? 'animate-bounce' : ''}
      `}>
        <span className={showFire ? 'animate-pulse' : ''}>
          {getStreakEmoji()}
        </span>
        <span className="ml-1">{streak}x</span>
      </div>
      {getStreakLabel() && (
        <span className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider animate-pulse">
          {getStreakLabel()}
        </span>
      )}
    </div>
  )
}
