'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onViolation: (msg: string) => void
  attemptId?: number | null
}

export default function Proctoring({ onViolation, attemptId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camStatus, setCamStatus] = useState<'loading' | 'ok' | 'error' | 'nocam'>('loading')
  const streamRef = useRef<MediaStream | null>(null)

  const captureAndSend = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState < 4 || video.videoWidth === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 320
    canvas.height = 240
    ctx.drawImage(video, 0, 0, 320, 240)

    // Cek frame hitam
    const imageData = ctx.getImageData(0, 0, 20, 20)
    const isBlack = Array.from(imageData.data)
      .filter((_, i) => i % 4 !== 3)
      .every(v => v < 15)
    if (isBlack) return

    const base64 = canvas.toDataURL('image/jpeg', 0.6)
    const user = JSON.parse(localStorage.getItem('moodle_user') || '{}')

    fetch('/api/moodle/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        attemptId,
        image: base64,
        time: new Date().toISOString()
      })
    }).catch(() => {})
  }, [attemptId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    let warmupInterval: NodeJS.Timeout

    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCamStatus('ok')

        // Warmup — tunggu video benar2 ada gambar
        let tries = 0
        warmupInterval = setInterval(() => {
          tries++
          const v = videoRef.current
          if (v && v.readyState >= 4 && v.videoWidth > 0) {
            clearInterval(warmupInterval)
            captureAndSend()
            // Kirim tiap 5 detik
            interval = setInterval(captureAndSend, 10000)
          }
          if (tries > 20) clearInterval(warmupInterval)
        }, 500)

      } catch {
        setCamStatus('nocam')
        // Tetap kirim notif ke server bahwa tidak ada kamera
        const user = JSON.parse(localStorage.getItem('moodle_user') || '{}')
        fetch('/api/moodle/snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userName: user.name,
            attemptId,
            image: null,
            noCam: true,
            time: new Date().toISOString()
          })
        }).catch(() => {})
        onViolation('Kamera tidak dapat diakses')
      }
    }

    startCam()

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(interval)
      clearInterval(warmupInterval)
    }
  }, [attemptId, captureAndSend, onViolation])

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
        {camStatus === 'nocam' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                <path stroke="#ef4444" strokeWidth="2" strokeLinecap="round" d="M3 3l18 18"/>
              </svg>
            </div>
            <p className="text-slate-400 text-xs text-center px-4">Tanpa kamera</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

        {camStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-xs">Mengaktifkan kamera...</p>
            </div>
          </div>
        )}

        {camStatus === 'ok' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-xs">Live</span>
          </div>
        )}

        {camStatus === 'nocam' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-900/70 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-white text-xs">No cam</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            camStatus === 'ok' ? 'bg-green-400' :
            camStatus === 'nocam' ? 'bg-red-400' :
            'bg-amber-400 animate-pulse'
          }`} />
          <span className="text-slate-600">
            {camStatus === 'ok' ? 'Kamera aktif' :
             camStatus === 'nocam' ? 'Tanpa kamera (dicatat)' :
             'Memuat kamera...'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-slate-600">Snapshot tiap 5 detik</span>
        </div>
      </div>
    </div>
  )
}