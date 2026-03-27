'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [camStatus, setCamStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  useEffect(() => {
    // Langsung minta izin kamera saat halaman login dibuka
    setCamStatus('requesting')
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        // Stop stream setelah dapat izin — nanti diaktifkan lagi saat ujian
        stream.getTracks().forEach(t => t.stop())
        setCamStatus('granted')
      })
      .catch(() => {
        setCamStatus('denied')
      })
  }, [])

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

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-100 h-50 rounded-xl flex items-center justify-center overflow-hidden">
            <img
              src="/favicon.png"
              alt="logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">MuktiLabs EXAM MANAGER</h1>
          <p className="text-slate-500 text-sm mt-1">Masuk untuk memulai ujian</p>
        </div>

        {/* Status kamera */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm mb-4 ${camStatus === 'granted' ? 'bg-green-50 border border-green-200 text-green-700' :
            camStatus === 'denied' ? 'bg-red-50 border border-red-200 text-red-700' :
              'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${camStatus === 'granted' ? 'bg-green-500' :
              camStatus === 'denied' ? 'bg-red-500' :
                'bg-amber-500 animate-pulse'
            }`} />
          {camStatus === 'requesting' && 'Meminta izin kamera...'}
          {camStatus === 'granted' && 'Kamera siap digunakan'}
          {camStatus === 'denied' && 'Kamera ditolak — izinkan kamera untuk ujian'}
          {camStatus === 'idle' && 'Memeriksa kamera...'}
        </div>

        {/* Warning kalau kamera ditolak */}
        {camStatus === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-red-700 leading-relaxed">
              Kamera diperlukan untuk proctoring ujian. Izinkan akses kamera di browser lalu refresh halaman ini.
            </p>
            <button
              onClick={() => {
                setCamStatus('requesting')
                navigator.mediaDevices.getUserMedia({ video: true })
                  .then(stream => { stream.getTracks().forEach(t => t.stop()); setCamStatus('granted') })
                  .catch(() => setCamStatus('denied'))
              }}
              className="mt-2 text-xs text-red-600 font-medium underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-4">MuktiLabs CBT v1.0</p>
      </div>
    </main>
  )
}