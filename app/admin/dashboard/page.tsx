// /admin/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  totalUsers: number
  totalQuizzes: number
  totalAttempts: number
  activeNow: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalQuizzes: 0, totalAttempts: 0, activeNow: 0 })
  const [recentAttempts, setRecentAttempts] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch terpisah supaya attempts bisa muncul duluan walau stats masih loading
    fetch('/api/moodle/admin/attempts')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setRecentAttempts(d.attempts || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingAttempts(false))

    fetch('/api/moodle/admin/stats')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setStats(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingStats(false))
  }, [])

  const statCards = [
    { label: 'Total Pengguna', value: stats.totalUsers, color: 'bg-violet-50 text-violet-700', icon: '◎' },
    { label: 'Total Quiz', value: stats.totalQuizzes, color: 'bg-blue-50 text-blue-700', icon: '✎' },
    { label: 'Total Attempt', value: stats.totalAttempts, color: 'bg-green-50 text-green-700', icon: '✓' },
    { label: 'Sedang Ujian', value: stats.activeNow, color: 'bg-amber-50 text-amber-700', icon: '◉' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan aktivitas CBT</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${card.color}`}>
              {card.icon}
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Attempt Terbaru */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Attempt Terbaru</h2>
          <button
            onClick={() => router.push('/admin/proctoring')}
            className="text-xs text-violet-600 hover:underline"
          >
            Lihat semua →
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {loadingAttempts ? (
            <div className="px-6 py-8 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Memuat attempt...</p>
            </div>
          ) : recentAttempts.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">Belum ada attempt</div>
          ) : recentAttempts.slice(0, 8).map((a, i) => (
            <div key={i} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{a.userfullname}</p>
                <p className="text-xs text-slate-400">
                  {a.quiz}
                  {a.courseName ? ` · ${a.courseName}` : ''}
                  {' · '}
                  {new Date(a.timestart * 1000).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {a.state === 'finished' && a.sumgrades != null && (
                  <span className="text-xs text-slate-500">
                    Nilai: <strong>{Number(a.sumgrades).toFixed(1)}</strong>
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  a.state === 'finished' ? 'bg-green-50 text-green-700' :
                  a.state === 'inprogress' ? 'bg-amber-50 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {a.state === 'finished' ? 'Selesai' :
                   a.state === 'inprogress' ? 'Berlangsung' : a.state}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}