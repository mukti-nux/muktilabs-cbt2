'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LiveKitRoom, useParticipants, useDataChannel } from '@livekit/components-react'

export default function LobbyPageWrapper() {
  const { courseId, quizId } = useParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [userName, setUserName] = useState('')
  const [lkUrl, setLkUrl] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('moodle_user')
    if (!user) { router.push('/'); return }
    const parsed = JSON.parse(user)
    setUserName(parsed.name)
    
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
    setLkUrl(url)

    fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomName: `lobby-${quizId}`, 
        participantName: parsed.name, 
        isTeacher: false 
      })
    })
    .then(r => r.json())
    .then(d => setToken(d.token))
    .catch(() => console.error('Gagal mengambil token LiveKit'))
  }, [quizId, router])

  if (!token || !lkUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-white mb-2">Mempersiapkan Ruang Ujian...</h2>
        <p className="text-slate-400">Pastikan LiveKit URL sudah dikonfigurasi di server.</p>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={lkUrl}
      connect={true}
    >
      <LobbyContent courseId={courseId as string} quizId={quizId as string} currentUser={userName} />
    </LiveKitRoom>
  )
}

function LobbyContent({ courseId, quizId, currentUser }: { courseId: string, quizId: string, currentUser: string }) {
  const router = useRouter()
  const participants = useParticipants()
  
  // State for Private Messaging
  const [selectedPeer, setSelectedPeer] = useState<{sid: string, identity: string} | null>(null)
  const [msgInput, setMsgInput] = useState('')
  const [flyMessages, setFlyMessages] = useState<{id: string, from: string, text: string}[]>([])

  // Send PM via data channel
  const { send } = useDataChannel('pm', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      if (data.type === 'PM') {
        const newMsg = { id: Math.random().toString(), from: data.from, text: data.text }
        setFlyMessages(prev => [...prev, newMsg])
        // Auto-remove flying message after 5 seconds
        setTimeout(() => {
          setFlyMessages(prev => prev.filter(m => m.id !== newMsg.id))
        }, 5000)
      }
    } catch (e) { console.error('Error parsing PM', e) }
  })

  // Listen for admin's START_EXAM signal
  useDataChannel('exam_control', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      if (data.type === 'START_EXAM') {
        // Pre-cache images before routing
        if (data.images && data.images.length > 0) {
          data.images.forEach((url: string) => {
            const img = new Image()
            img.src = url
          })
        }
        
        // Save the secret password sent by Admin
        sessionStorage.setItem(`lobby_pass_${quizId}`, data.password || '')
        
        // Route to the actual exam (it will read session storage and auto-start)
        router.push(`/exam/${courseId}/${quizId}`)
      }
    } catch (e) { console.error('Error parsing exam control', e) }
  })

  const sendPM = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeer || !msgInput.trim()) return
    const payload = JSON.stringify({ type: 'PM', from: currentUser, text: msgInput })
    send(new TextEncoder().encode(payload), { destinationIdentities: [selectedPeer.identity] })
    setMsgInput('')
    setSelectedPeer(null)
  }

  // Pre-calculated random colors for bubbles
  const bubbleColors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
  ]

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden flex flex-col">
      {/* Cool animated background mesh */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/30 blur-[100px] rounded-full animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/30 blur-[100px] rounded-full animate-pulse delay-1000 pointer-events-none"></div>

      {/* Floating incoming messages (like stream chat) */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {flyMessages.map(m => (
          <div key={m.id} className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 animate-bounce bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-4 rounded-3xl shadow-2xl">
            <p className="text-xs text-violet-300 font-bold mb-1">{m.from}</p>
            <p className="text-xl">{m.text}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 text-center tracking-tight">
          Menunggu Ujian Dimulai
        </h1>
        <p className="text-slate-300 mb-12 text-center max-w-lg">
          Silakan membaur. Admin sedang menarik data soal secara diam-diam. Sebentar lagi kuis akan otomatis terbuka.
        </p>

        {/* Bubbles Arena */}
        <div className="relative w-full max-w-4xl h-[60vh] bg-white/5 backdrop-blur-sm border border-white/10 rounded-[3rem] p-8 flex flex-wrap gap-6 items-center justify-center content-center shadow-2xl">
          {participants.map((p, i) => {
            const isMe = p.identity === currentUser
            const color = bubbleColors[i % bubbleColors.length]
            
            return (
              <div 
                key={p.sid}
                onClick={() => !isMe && setSelectedPeer({sid: p.sid, identity: p.identity})}
                className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-110 hover:-translate-y-2 animate-in zoom-in fade-in`}
              >
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${color} flex items-center justify-center shadow-lg border-2 border-white/20 relative overflow-hidden`}>
                  {/* Glass reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/30"></div>
                  <span className="text-white font-bold text-2xl relative z-10 drop-shadow-md">
                    {p.identity.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                {/* Name Label */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                  {isMe ? 'Kamu' : p.identity.split(' ')[0]}
                </span>
                
                {/* Interaction indicator */}
                {!isMe && (
                  <div className="absolute top-0 right-0 w-6 h-6 bg-white text-slate-800 rounded-full flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all">
                    👋
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Private Message Modal */}
      {selectedPeer && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform scale-100 transition-all">
            <h3 className="text-white font-bold mb-1">Kirim pesan ke {selectedPeer.identity.split(' ')[0]}</h3>
            <p className="text-slate-400 text-sm mb-6">Pesan ini akan muncul melayang di layar mereka.</p>
            
            <form onSubmit={sendPM}>
              <input 
                type="text" 
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                placeholder="Tulis pesan atau emoji..." 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setSelectedPeer(null)}
                  className="flex-1 py-3 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors font-medium"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={!msgInput.trim()}
                  className="flex-1 py-3 text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors font-semibold"
                >
                  Kirim 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
