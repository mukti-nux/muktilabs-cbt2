'use client'
import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiProps {
  trigger?: boolean
  type?: 'full' | 'burst' | 'quick'
}

export default function Confetti({ trigger = false, type = 'full' }: ConfettiProps) {
  const fireConfetti = useCallback(() => {
    const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24', '#f472b6']
    
    if (type === 'full') {
      // Full screen celebration
      const duration = 3000
      const end = Date.now() + duration
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        })
        
        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
      
      // Big burst in the middle
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors,
      })
    } else if (type === 'burst') {
      // Single burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      })
    } else {
      // Quick pop
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors,
      })
    }
  }, [type])

  useEffect(() => {
    if (trigger) {
      fireConfetti()
    }
  }, [trigger, fireConfetti])

  return null
}

// Standalone confetti function for calling from event handlers
export function celebrate(type: 'full' | 'burst' | 'quick' = 'burst') {
  const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24', '#f472b6']
  
  if (type === 'full') {
    const duration = 3000
    const end = Date.now() + duration
    
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })
      
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
    
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors,
    })
  } else if (type === 'burst') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    })
  } else {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors,
    })
  }
}
