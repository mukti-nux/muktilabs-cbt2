'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onViolation: (msg: string) => void
  attemptId?: number | null
}

export default function Proctoring({ onViolation, attemptId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camStatus, setCamStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let stream: MediaStream
    let interval: NodeJS.Timeout

    async function startCam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCamStatus('ok')
        }

        // Screenshot tiap 15 detik dan kirim ke server
        interval = setInterval(() => {
          captureAndSend()
        }, 15000)

        // Kirim segera setelah kamera aktif
        setTimeout(captureAndSend, 2000)

      } catch {
        setCamStatus('error')
        onViolation('Kamera tidak dapat diakses')
      }
    }

    function captureAndSend() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = 320
      canvas.height = 240
      ctx.drawImage(video, 0, 0, 320, 240)
      const imageData = canvas.toDataURL('image/jpeg', 0.6)
      const user = JSON.parse(localStorage.getItem('moodle_user') || '{}')

      fetch('/api/moodle/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          attemptId,
          image: imageData,
          time: new Date().toISOString()
        })
      }).catch(() => {})
    }

    startCam()
    return () => {
      stream?.getTracks().forEach(t => t.stop())
      clearInterval(interval)
    }
  }, [onViolation, attemptId])

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {camStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-xs">Mengaktifkan kamera...</p>
          </div>
        )}
        {camStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900">
            <p className="text-red-200 text-xs text-center px-4">Kamera tidak tersedia</p>
          </div>
        )}
        {camStatus === 'ok' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-xs">Live</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${camStatus === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-slate-600">{camStatus === 'ok' ? 'Kamera aktif' : camStatus === 'error' ? 'Kamera error' : 'Memuat...'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-slate-600">Fullscreen aktif</span>
        </div>
      </div>
    </div>
  )
}