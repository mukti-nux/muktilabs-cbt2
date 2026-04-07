'use client'
import { useState, useCallback } from 'react'
import { ReactNode } from 'react'

type SoundType = 'correct' | 'wrong' | 'click' | 'complete' | 'tick' | 'streak'

interface SoundEffectsReturn {
  playSound: (type: SoundType) => void
  muted: boolean
  toggleMute: () => void
  MuteButton: () => ReactNode
}

export default function useSoundEffects(enabled: boolean = true, volume: number = 0.5): SoundEffectsReturn {
  const [muted, setMuted] = useState(!enabled)

  const playSound = useCallback((type: SoundType) => {
    if (muted) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const vol = gainNode.gain
      vol.setValueAtTime(volume, audioContext.currentTime)

      switch (type) {
        case 'correct':
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2)
          vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.4)
          break

        case 'wrong':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.15)
          vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break

        case 'click':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.05)
          break

        case 'complete':
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15)
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3)
          oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.45)
          vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.7)
          break

        case 'tick':
          oscillator.type = 'square'
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime)
          vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.02)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.02)
          break

        case 'streak':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2)
          vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break
      }
    } catch (e) {
      console.warn('Audio not supported:', e)
    }
  }, [muted, volume])

  const toggleMute = () => setMuted(!muted)

  const MuteButton = () => (
    <button
      onClick={toggleMute}
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? (
        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  )

  return { playSound, muted, toggleMute, MuteButton }
}

// Standalone sound functions
export const playSound = (type: SoundType, volume: number = 0.5) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    const vol = gainNode.gain
    vol.setValueAtTime(volume, audioContext.currentTime)

    switch (type) {
      case 'correct':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2)
        vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)
        break

      case 'wrong':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.15)
        vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        break

      case 'complete':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15)
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3)
        oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.45)
        vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.7)
        break

      case 'streak':
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2)
        vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        break

      default:
        vol.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
    }
  } catch (e) {
    // Silent fail if audio not supported
  }
}
