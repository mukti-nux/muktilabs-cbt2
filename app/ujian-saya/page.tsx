'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuizAttempt {
  quizId: number
  quizName: string
  courseId: number
  courseName: string
  timelimit: number
  timeopen: number
  timeclose: number
  attempt: {
    id: number
    state: string
    timestart: number
    timefinish: number
    sumgrades: number
    grade?: number
  } | null
  maxgrade: number
  hasquestions: number
}

export default function UjianSayaPage() {
  const router = useRouter()
  const [data, setData] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'selesai' | 'belum'>('all')

  useEffect(() => {
    const token = localStorage.getItem('moodle_token')
    const user = JSON.parse(localStorage.getItem('moodle_user') || '{}')
    if (!token) { router.push('/'); return }

    fetch(`/api/moodle/my-quizzes?userId=${user.id}`, {
      headers: { 'x-token': token }
    })
      .then(r => r.json())
      .then(d => { setData(d.quizzes || []); setLoading(false) })
  }, [router])

  function formatTime(seconds: number) {
    if (!seconds) return 'Tidak dibatasi'
    return `${Math.floor(seconds / 60)} Menit`
  }

  function formatDate(ts: number) {
    if (!ts) return '-'
    return new Date(ts * 1000).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function getStatusBadge(q: QuizAttempt) {
    if (!q.attempt) return { label: 'Belum Dikerjakan', color: 'bg-slate-100 text-slate-500' }
    if (q.attempt.state === 'inprogress') return { label: 'Berlangsung', color: 'bg-amber-100 text-amber-700' }
    return { label: 'Selesai', color: 'bg-green-100 text-green-700' }
  }

  const filtered = data.filter(q => {
    const matchSearch = q.quizName.toLowerCase().includes(search.toLowerCase()) ||
      q.courseName.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      (filter === 'selesai' && q.attempt?.state === 'finished') ||
      (filter === 'belum' && !q.attempt)
    return matchSearch && matchFilter
  })

  const selesaiCount = data.filter(q => q.attempt?.state === 'finished').length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar sama seperti dashboard */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-slate-100 flex flex-col z-10">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">MuktiLabs CBT</p>
              <p className="text-xs text-slate-400">Portal Ujian</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <div
            onClick={() => router.push('/dashboard')}
            className="px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#94a3b8" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            </div>
            <span className="text-sm text-slate-600">Dashboard</span>
          </div>
          <div className="px-3 py-2.5 rounded-xl bg-violet-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="white" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <span className="text-sm font-medium text-violet-700">Ujian Saya</span>
          </div>
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => { localStorage.clear(); router.push('/') }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 hover:bg-red-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-red-100 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </div>
            <span className="text-sm text-slate-500 group-hover:text-red-600 transition-colors">Keluar</span>
          </button>
        </div>
      </aside>

      <main className="ml-60 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="white" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Daftar Ujian</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-violet-500 rounded-full" />
              <span className="text-xs text-slate-500 font-medium">{data.length} UJIAN TERSEDIA</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                type="text"
                placeholder="Cari ujian..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-52"
              />
            </div>
            <button
              onClick={() => setLoading(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Perbarui
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
          {([
            { key: 'all', label: 'Semua Ujian' },
            { key: 'belum', label: 'Belum Dikerjakan' },
            { key: 'selesai', label: 'Selesai' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 bg-violet-600 rounded-full" />
          <h2 className="font-semibold text-slate-700">
            {filter === 'all' ? 'Semua Ujian' : filter === 'selesai' ? 'Ujian Selesai' : 'Belum Dikerjakan'}
          </h2>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat daftar ujian...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">Tidak ada ujian ditemukan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q, i) => {
              const status = getStatusBadge(q)
              const isFinished = q.attempt?.state === 'finished'
              const isInProgress = q.attempt?.state === 'inprogress'
              return (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4 hover:border-violet-200 hover:shadow-sm transition-all">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isFinished ? 'bg-green-50' : isInProgress ? 'bg-amber-50' : 'bg-violet-50'
                  }`}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <path fill={isFinished ? '#22c55e' : isInProgress ? '#f59e0b' : '#7c3aed'}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                        {q.courseName}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{q.quizName}</h3>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        {q.timeopen ? formatDate(q.timeopen) : 'Kapan saja'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {formatTime(q.timelimit)}
                      </span>
                      {isFinished && q.attempt && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          Nilai: {Number(q.attempt.sumgrades || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status + Action */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    {isFinished ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/exam/${q.courseId}/${q.quizId}/result?attemptId=${q.attempt?.id}`)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                          title="Lihat hasil"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="#64748b" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        </button>
                        <button
                          onClick={() => router.push(`/exam/${q.courseId}/${q.quizId}`)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                          title="Ulangi ujian"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="#64748b" strokeWidth="2" strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        </button>
                        <button
                          onClick={() => router.push(`/exam/${q.courseId}/${q.quizId}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          Kerjakan Lagi
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push(`/exam/${q.courseId}/${q.quizId}`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
                      >
                        {isInProgress ? 'Lanjutkan' : 'Kerjakan Sekarang'}
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="white" strokeWidth="2" strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}