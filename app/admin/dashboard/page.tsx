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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const load = () => {
    Promise.all([
      fetch('/api/moodle/admin/stats').then(r => r.json()),
      fetch('/api/moodle/admin/attempts').then(r => r.json()),
    ]).then(([s, a]) => {
      setStats(s)
      setRecentAttempts(a.attempts || [])
      setLoading(false)
    })
  }

  load()
  const interval = setInterval(load, 5000)
  return () => clearInterval(interval)
}, [])

  const statCards = [
    { label: 'Total Pengguna', value: stats.totalUsers, color: 'bg-violet-50 text-violet-700', icon: '◎' },
    { label: 'Total Quiz', value: stats.totalQuizzes, color: 'bg-blue-50 text-blue-700', icon: '✎' },
    { label: 'Total Attempt', value: stats.totalAttempts, color: 'bg-green-50 text-green-700', icon: '✓' },
    { label: 'Sedang Ujian', value: stats.activeNow, color: 'bg-amber-50 text-amber-700', icon: '◉' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400 text-sm">Memuat data...</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan aktivitas CBT</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-medium">Peserta</th>
                <th className="text-left px-6 py-3 font-medium">Quiz</th>
                <th className="text-left px-6 py-3 font-medium">Mulai</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentAttempts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    Belum ada attempt
                  </td>
                </tr>
              ) : (
                recentAttempts.slice(0, 10).map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">

                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-700">{a.userfullname}</p>
                    </td>

                    <td className="px-6 py-3 text-slate-600">
                      {a.quiz}
                    </td>

                    <td className="px-6 py-3 text-slate-500">
                      {new Date(a.timestart * 1000).toLocaleString('id-ID')}
                    </td>

                    <td className="px-6 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.state === 'finished'
                          ? 'bg-green-50 text-green-700'
                          : a.state === 'inprogress'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {a.state === 'finished'
                          ? 'Selesai'
                          : a.state === 'inprogress'
                            ? 'Berlangsung'
                            : a.state}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}