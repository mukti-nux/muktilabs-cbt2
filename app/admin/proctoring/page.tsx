'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import LivePage from './live/page'

interface Attempt {
  id: number
  userfullname: string
  quiz: string
  state: string
  timestart: number
  timefinish: number
  sumgrades: number
}

export default function ProctoringPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'inprogress' | 'finished'>('all')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/moodle/admin/attempts')
      .then(r => r.json())
      .then(d => { setAttempts(d.attempts || []); setLoading(false) })
  }, [])

  const filtered = attempts.filter(a => {
    const matchState = filter === 'all' || a.state === filter
    const matchSearch = a.userfullname?.toLowerCase().includes(search.toLowerCase()) ||
      a.quiz?.toLowerCase().includes(search.toLowerCase())
    return matchState && matchSearch
  })

  const activeCount = attempts.filter(a => a.state === 'inprogress').length
  const finishedCount = attempts.filter(a => a.state === 'finished').length

  function duration(start: number, finish: number) {
    if (!finish) return 'Berlangsung...'
    const diff = finish - start
    const m = Math.floor(diff / 60)
    return `${m} menit`
  }

  const [snapshots, setSnapshots] = useState<any[]>([])

  // Tambah di useEffect
  useEffect(() => {
    const loadSnaps = () => {
      fetch('/api/moodle/snapshots')
        .then(r => r.json())
        .then(d => setSnapshots(d.snapshots || []))
    }
    loadSnaps()
    const i = setInterval(loadSnaps, 10000)
    return () => clearInterval(i)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Proctoring</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor aktivitas ujian siswa</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-2xl font-bold text-amber-700">{activeCount}</p>
          <p className="text-xs text-amber-600 mt-1">Sedang berlangsung</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-2xl font-bold text-green-700">{finishedCount}</p>
          <p className="text-xs text-green-600 mt-1">Selesai</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
          <p className="text-2xl font-bold text-violet-700">{attempts.length}</p>
          <p className="text-xs text-violet-600 mt-1">Total attempt</p>
        </div>
      </div>

      {/* Live Camera Grid */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            Kamera Aktif ({snapshots.length})
          </h2>
          <Link href="/admin/proctoring/live" className="text-xs text-violet-600 hover:underline">
            Lihat semua kamera
          </Link>
        </div>
        {snapshots.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Belum ada siswa yang aktif dengan kamera
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {snapshots.slice(0, 8).map((snap, i) => (
              <div
                key={i}
                onClick={() => setSelectedKey(snap.key)}
                className={`relative rounded-xl overflow-hidden bg-slate-900 aspect-video cursor-pointer transition-all group ${selectedKey === snap.key ? 'ring-2 ring-violet-400 scale-105' : 'hover:ring-2 hover:ring-violet-400'}`}
              >
                {snap.noCam ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="text-slate-500 text-xs">Tanpa kamera</span>
                  </div>
                ) : snap.image ? (
                  <img src={snap.image} alt={snap.userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-slate-500 text-xs">Tidak ada gambar</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">{snap.userName}</p>
                  <p className="text-white/50 text-xs">{new Date(snap.time).toLocaleTimeString('id-ID')}</p>
                </div>
                <div className="absolute top-1.5 right-1.5">
                  <span className={`w-2 h-2 rounded-full block ${snap.noCam ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Cari nama / quiz..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
          />
          <div className="flex gap-2">
            {(['all', 'inprogress', 'finished'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {f === 'all' ? 'Semua' : f === 'inprogress' ? 'Berlangsung' : 'Selesai'}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setLoading(true); fetch('/api/moodle/admin/attempts').then(r => r.json()).then(d => { setAttempts(d.attempts || []); setLoading(false) }) }}
            className="ml-auto text-xs text-violet-600 hover:underline"
          >
            Refresh ↻
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Tidak ada data</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Siswa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Quiz</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Mulai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Durasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Nilai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700 flex-shrink-0">
                        {a.userfullname?.slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <span className="font-medium text-slate-700">{a.userfullname || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{a.quiz}</td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {new Date(a.timestart * 1000).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {duration(a.timestart, a.timefinish)}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-700">
                    {a.sumgrades != null ? Number(a.sumgrades).toFixed(1) : '-'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${a.state === 'finished' ? 'bg-green-50 text-green-700' :
                      a.state === 'inprogress' ? 'bg-amber-50 text-amber-700 animate-pulse' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                      {a.state === 'finished' ? 'Selesai' :
                        a.state === 'inprogress' ? 'Berlangsung' : a.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-3">Live Monitoring</h2>
        <LivePage />
      </div>
    </div>
  )
}