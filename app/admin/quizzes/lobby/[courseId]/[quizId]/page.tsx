'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LiveKitRoom, useParticipants, useDataChannel } from '@livekit/components-react'

export default function AdminLobbyWrapper() {
  const { courseId, quizId } = useParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [lkUrl, setLkUrl] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('moodle_user')
    if (!user) { router.push('/'); return }
    const parsed = JSON.parse(user)
    
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
    setLkUrl(url)

    fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomName: `lobby-${quizId}`, 
        participantName: `Admin - ${parsed.name}`, 
        isTeacher: true 
      })
    })
    .then(r => r.json())
    .then(d => setToken(d.token))
    .catch(() => console.error('Gagal mengambil token LiveKit Admin'))
  }, [quizId, router])

  if (!token || !lkUrl) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-lg font-bold text-slate-700">Mempersiapkan Command Center...</h2>
    </div>
  )

  return (
    <LiveKitRoom token={token} serverUrl={lkUrl} connect={true}>
      <AdminLobbyContent courseId={courseId as string} quizId={quizId as string} />
    </LiveKitRoom>
  )
}

function AdminLobbyContent({ courseId, quizId }: { courseId: string, quizId: string }) {
  const router = useRouter()
  const participants = useParticipants()
  const studentParticipants = participants.filter(p => !p.identity.startsWith('Admin'))

  const [password, setPassword] = useState('')
  const [prepared, setPrepared] = useState(false)
  const [loadingPrepare, setLoadingPrepare] = useState(false)
  const [precachedImages, setPrecachedImages] = useState<string[]>([])

  // Setup PM listening/sending
  const [selectedPeer, setSelectedPeer] = useState<{sid: string, identity: string} | null>(null)
  const [msgInput, setMsgInput] = useState('')

  const { send: sendExam } = useDataChannel('exam_control')
  const { send: sendPm } = useDataChannel('pm')

  const handlePrepare = async () => {
    setLoadingPrepare(true)
    // Here we simulate fetching the quiz from moodle and extracting all asset URLs.
    // In a real environment, you'd call an API that parses Moodle's quiz questions for <img src="..." />
    setTimeout(() => {
      setPrecachedImages([
        'https://via.placeholder.com/600x400?text=Soal+1+Grafik',
        'https://via.placeholder.com/800x600?text=Peta+Geografi'
      ])
      setPrepared(true)
      setLoadingPrepare(false)
    }, 1500)
  }

  const handleBroadcastStart = () => {
    if (!prepared) return alert('Silakan narik Data Soal terlebih dahulu supaya caching siswa berjalan lancar.')
    if (!password) return alert('Mohon isi Password Ujian (jika ada) yang akan dilempar ke device siswa otomatis.')
    
    const payload = JSON.stringify({
      type: 'START_EXAM',
      password: password,
      images: precachedImages
    })

    sendExam(new TextEncoder().encode(payload), { reliable: true })
    alert('Sinyal berhasil ditembakkan! Seluruh siswa di ruang tunggu sedang otomatis masuk ke soal.')
    router.push(`/admin/quizzes`)
  }

  const sendPM = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeer || !msgInput.trim()) return
    const payload = JSON.stringify({ type: 'PM', from: 'Pengawas Ujian', text: msgInput })
    sendPm(new TextEncoder().encode(payload), { destinationIdentities: [selectedPeer.identity] })
    setMsgInput('')
    setSelectedPeer(null)
    alert(`Pesan/Teguran terkirim ke ${selectedPeer.identity}!`)
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ruang Kendali Ujian (Lobby)</h1>
          <p className="text-slate-500">Mata Pelajaran {courseId} | Kuis {quizId}</p>
        </div>
        <div className="bg-violet-100 text-violet-700 px-4 py-2 rounded-xl font-bold">
          {studentParticipants.length} Siswa Menunggu
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel: Bubble Map */}
        <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-100 p-6 min-h-[400px]">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Radar Peserta Langsung
          </h3>
          
          {studentParticipants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="mb-3"><path stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <p className="text-slate-400">Belum ada siswa yang bergabung di ruang kendali.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {studentParticipants.map(p => (
                <div 
                  key={p.sid} 
                  onClick={() => setSelectedPeer({sid: p.sid, identity: p.identity})}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md border-2 border-white transform transition-transform group-hover:scale-110 mb-2 group-hover:shadow-violet-500/40">
                    <span className="text-white font-bold text-lg">{p.identity.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                    {p.identity.split(' ')[0]}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 mt-1 flex gap-1 transition-opacity">
                    <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded shadow">Beri Pesan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Controls */}
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <h3 className="font-bold text-amber-800 mb-2">Langkah 1: Persiapan Cache</h3>
            <p className="text-xs text-amber-700 mb-4">Tarik struktur ujian agar seluruh aset dan gambar didownload diam-diam ke HP siswa di lobby.</p>
            <button 
              onClick={handlePrepare}
              disabled={prepared || loadingPrepare}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                prepared ? 'bg-amber-100 text-amber-600 cursor-not-allowed' : 
                'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              }`}
            >
              {loadingPrepare ? 'Mengekstrak Soal...' : prepared ? 'Aset Sudah Terdistribusi ✅' : 'Tarik & Distribusi Cache'}
            </button>
          </div>

          <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5">
            <h3 className="font-bold text-violet-800 mb-2">Langkah 2: Broadcast Eksekusi</h3>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-violet-600 mb-1">Moodle Quiz Password</label>
              <input 
                type="text" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan pass (misal: 12345)"
                className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" 
              />
              <p className="text-[10px] text-violet-400 mt-1">Sandi ini akan dilempar rahasia ke ujian siswa tanpa mereka perlu repot mengetik.</p>
            </div>
            <button 
              onClick={handleBroadcastStart}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transform hover:-translate-y-1 transition-all"
            >
              MULAI UJIAN SEKARANG 🚀
            </button>
          </div>
        </div>
      </div>

      {/* Private Message Modal */}
      {selectedPeer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
            <h3 className="text-slate-800 font-bold mb-1">Beri Pesan Personal ke {selectedPeer.identity}</h3>
            <p className="text-slate-500 text-sm mb-6">Pesan ini akan melayang di layar hapenya selagi nunggu ujian.</p>
            
            <form onSubmit={sendPM}>
              <input 
                type="text" 
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                placeholder="Misal: Jangan telat absen bro..." 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setSelectedPeer(null)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                >
                  Tutup
                </button>
                <button 
                  type="submit"
                  disabled={!msgInput.trim()}
                  className="flex-1 py-3 text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors font-semibold shadow-md"
                >
                  Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
