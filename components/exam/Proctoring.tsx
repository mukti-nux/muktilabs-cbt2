'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'

interface Props {
  onViolation: (msg: string) => void
  attemptId?: number | null
}

function CameraPublisher({ onViolation, attemptId, userName }: {
  onViolation: (msg: string) => void
  attemptId?: number | null
  userName: string
}) {
  const { localParticipant } = useLocalParticipant()
  const [camStatus, setCamStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    async function enableCam() {
      try {
        await localParticipant.setCameraEnabled(true)
        setCamStatus('ok')

        // Screenshot tiap 15 detik
        const interval = setInterval(() => captureSnapshot(), 15000)
        setTimeout(() => captureSnapshot(), 3000)

        return () => clearInterval(interval)
      } catch {
        setCamStatus('error')
        onViolation('Kamera tidak dapat diakses')

        // Kirim notif ke server bahwa tidak ada kamera
        fetch('/api/moodle/snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 0,
            userName,
            attemptId,
            image: null,
            time: new Date().toISOString(),
            noCam: true
          })
        }).catch(() => {})
      }
    }
    enableCam()
  }, [localParticipant])

  function captureSnapshot() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 4 || video.videoWidth === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 320
    canvas.height = 240
    ctx.drawImage(video, 0, 0, 320, 240)

    const imageData = ctx.getImageData(0, 0, 10, 10)
    const isBlack = imageData.data.every((v, i) => i % 4 === 3 || v < 10)
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
  }

  const tracks = useTracks([Track.Source.Camera])
  const localTrack = tracks.find(t => t.participant.isLocal)

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
        {localTrack ? (
          <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {camStatus === 'loading' && <p className="text-white text-xs">Mengaktifkan kamera...</p>}
            {camStatus === 'error' && <p className="text-red-300 text-xs text-center px-4">Kamera tidak tersedia — ujian dicatat tanpa kamera</p>}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        {camStatus === 'ok' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-xs">Live</span>
          </div>
        )}
        {camStatus === 'error' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-900/70 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-white text-xs">No cam</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${camStatus === 'ok' ? 'bg-green-400' : camStatus === 'error' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-slate-600">
            {camStatus === 'ok' ? 'Kamera aktif' : camStatus === 'error' ? 'Tanpa kamera (dicatat)' : 'Memuat kamera...'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-slate-600">Terhubung ke server</span>
        </div>
      </div>
    </div>
  )
}

export default function Proctoring({ onViolation, attemptId }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [roomName, setRoomName] = useState('')
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://livekit.muktilabs.my.id'

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('moodle_user') || '{}')
    const name = user.name || 'Siswa'
    const room = `exam-${attemptId || 'default'}`
    setUserName(name)
    setRoomName(room)

    fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: room,
        participantName: name,
        isTeacher: false
      })
    })
      .then(r => r.json())
      .then(d => setToken(d.token))
      .catch(() => onViolation('Gagal terhubung ke server proctoring'))
  }, [attemptId])

  if (!token) return (
    <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white text-xs">Menghubungkan...</p>
      </div>
    </div>
  )

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={() => onViolation('Koneksi proctoring terputus')}
    >
      <CameraPublisher
        onViolation={onViolation}
        attemptId={attemptId}
        userName={userName}
      />
    </LiveKitRoom>
  )
}