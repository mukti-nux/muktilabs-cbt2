'use client'
import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  useParticipants,
} from '@livekit/components-react'
import { Track } from 'livekit-client'

function ParticipantGrid({ onSelect }: { onSelect: (name: string) => void }) {
  const participants = useParticipants()
  const tracks = useTracks([Track.Source.Camera])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {participants.filter(p => !p.isLocal).map(participant => {
        const track = tracks.find(t => t.participant.identity === participant.identity)
        return (
          <div
            key={participant.identity}
            onClick={() => onSelect(participant.identity)}
            className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video cursor-pointer hover:ring-2 hover:ring-violet-400 transition-all"
          >
            {track ? (
              <VideoTrack trackRef={track} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-1">
                    <span className="text-white text-xs font-bold">
                      {participant.identity.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">Tidak ada kamera</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-medium truncate">{participant.identity}</p>
            </div>
            <div className="absolute top-2 right-2">
              <span className={`w-2 h-2 rounded-full block ${track ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
          </div>
        )
      })}
      {participants.filter(p => !p.isLocal).length === 0 && (
        <div className="col-span-4 p-8 text-center text-slate-400 text-sm">
          Belum ada siswa yang terhubung
        </div>
      )}
    </div>
  )
}

export default function LiveKitMonitor({ roomName }: { roomName: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://livekit.muktilabs.my.id'

  useEffect(() => {
    fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        participantName: 'guru-monitor',
        isTeacher: true
      })
    })
      .then(r => r.json())
      .then(d => setToken(d.token))
  }, [roomName])

  if (!token) return (
    <div className="p-8 text-center text-slate-400 text-sm">
      Menghubungkan ke server monitor...
    </div>
  )

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      connect={true}
      audio={false}
      video={false}
    >
      <ParticipantGrid onSelect={setSelected} />
    </LiveKitRoom>
  )
}