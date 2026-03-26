'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onViolation: (msg: string) => void
}

export default function Proctoring({ onViolation }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camStatus, setCamStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [faceStatus, setFaceStatus] = useState<'ok' | 'missing'>('ok')

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

        // Screenshot tiap 30 detik
        interval = setInterval(() => {
          takeScreenshot()
        }, 30000)

      } catch {
        setCamStatus('error')
        onViolation('Kamera tidak dapat diakses')
      }
    }

    function takeScreenshot() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      // Simpan ke localStorage sebagai log sederhana
      const timestamp = new Date().toISOString()
      const screenshots = JSON.parse(localStorage.getItem('proctor_screenshots') || '[]')
      screenshots.push({ time: timestamp, note: 'auto-capture' })
      localStorage.setItem('proctor_screenshots', JSON.stringify(screenshots.slice(-20)))
    }

    startCam()
    return () => {
      stream?.getTracks().forEach(t => t.stop())
      clearInterval(interval)
    }
  }, [onViolation])

  return (
    <div className="space-y-3">
      {/* Video feed */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
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

      {/* Status */}
      <div className="space-y-1.5">
        <StatusRow
          ok={camStatus === 'ok'}
          label={camStatus === 'ok' ? 'Kamera aktif' : 'Kamera tidak aktif'}
        />
        <StatusRow ok label="Fullscreen aktif" />
      </div>
    </div>
  )
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  )
}