'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [camStatus, setCamStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [fsStatus, setFsStatus] = useState<'idle' | 'granted' | 'exited'>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Minta kamera otomatis saat halaman dibuka
    setCamStatus('requesting')
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamStatus('granted')
      })
      .catch(() => setCamStatus('denied'))

    // Monitor fullscreen
    function onFsChange() {
      if (document.fullscreenElement) {
        setFsStatus('granted')
      } else {
        setFsStatus(prev => prev === 'idle' ? 'idle' : 'exited')
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function requestFullscreen() {
    document.documentElement.requestFullscreen().catch(() => { })
  }

  function retryCam() {
    setCamStatus('requesting')
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamStatus('granted')
      })
      .catch(() => setCamStatus('denied'))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/moodle/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('moodle_token', data.token)
      localStorage.setItem('moodle_user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  const allReady = fsStatus === 'granted'

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-100 h-30 rounded-xl flex items-center justify-center overflow-hidden">
            <img
              src="/favicon.png"
              alt="logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">MuktiLabs EXAM MANAGER</h1>
          <p className="text-slate-500 text-sm mt-1">Login untuk memulai ujian</p>
        </div>

        {/* Status checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Persiapan ujian</p>

          {/* Kamera */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${camStatus === 'granted' ? 'bg-green-50' :
                  camStatus === 'denied' ? 'bg-red-50' : 'bg-amber-50'
                }`}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path fill={camStatus === 'granted' ? '#22c55e' : camStatus === 'denied' ? '#ef4444' : '#f59e0b'}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Kamera</p>
                <p className="text-xs text-slate-400">
                  {camStatus === 'requesting' && 'Meminta izin...'}
                  {camStatus === 'granted' && 'Siap digunakan'}
                  {camStatus === 'denied' && 'Akses ditolak'}
                  {camStatus === 'idle' && 'Memeriksa...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {camStatus === 'denied' && (
                <button onClick={retryCam} className="text-xs text-violet-600 hover:underline">
                  Coba lagi
                </button>
              )}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${camStatus === 'granted' ? 'bg-green-500' :
                  camStatus === 'denied' ? 'bg-red-500' :
                    'bg-amber-400 animate-pulse'
                }`}>
                {camStatus === 'granted' && (
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <path stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {camStatus === 'denied' && (
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <path stroke="white" strokeWidth="3" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Preview kamera kecil */}
          {camStatus === 'granted' && (
            <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}

          {/* Fullscreen */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fsStatus === 'granted' ? 'bg-green-50' :
                  fsStatus === 'exited' ? 'bg-red-50' : 'bg-slate-100'
                }`}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path stroke={fsStatus === 'granted' ? '#22c55e' : fsStatus === 'exited' ? '#ef4444' : '#94a3b8'}
                    strokeWidth="2" strokeLinecap="round"
                    d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Fullscreen</p>
                <p className="text-xs text-slate-400">
                  {fsStatus === 'idle' && 'Belum aktif'}
                  {fsStatus === 'granted' && 'Aktif'}
                  {fsStatus === 'exited' && 'Keluar dari fullscreen'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {fsStatus !== 'granted' && (
                <button
                  onClick={requestFullscreen}
                  className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Aktifkan
                </button>
              )}
              {fsStatus === 'granted' && (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <path stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form login */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {camStatus === 'denied' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded-lg">
              Kamera tidak tersedia atau ditolak — tetap bisa login tanpa kamera.
            </div>
          )}
          {!allReady && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg">
              Aktifkan fullscreen terlebih dahulu sebelum login.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Username Moodle kamu"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !allReady}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Memverifikasi...' : allReady ? 'Masuk' : 'Aktifkan fullscreen dulu'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-4">MuktiLabs CBT v1.0</p>
      </div>
    </main>
  )
}