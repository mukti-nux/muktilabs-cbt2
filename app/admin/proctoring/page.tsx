'use client'
import { useEffect, useState } from 'react'

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
    const [snapshots, setSnapshots] = useState<any[]>([])

    useEffect(() => {
        const load = () => {
            fetch('/api/moodle/admin/attempts')
                .then(r => r.json())
                .then(d => { setAttempts(d.attempts || []); setLoading(false) })
        }
        load()
        const interval = setInterval(load, 5000)
        return () => clearInterval(interval)
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

    function ViolationMonitor() {
        const [violations, setViolations] = useState<any[]>([])

        useEffect(() => {
            const load = () => {
                fetch('/api/moodle/admin/violations')
                    .then(r => r.json())
                    .then(d => setViolations(d.violations || []))
            }
            load()
            const i = setInterval(load, 5000)
            return () => clearInterval(i)
        }, [])

        if (violations.length === 0) return (
            <div className="p-8 text-center text-slate-400 text-sm">Belum ada pelanggaran</div>
        )

        return (
            <div className="divide-y divide-slate-100">
                {violations.map((v, i) => (
                    <div key={i} className="px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-semibold text-red-700">
                                {v.userName?.slice(0, 2).toUpperCase() || '??'}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">{v.userName}</p>
                                <p className="text-xs text-slate-400">Attempt {v.attemptId}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-red-600">{v.type}</p>
                            <p className="text-xs text-slate-400">{v.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    function LiveCamGrid() {
        const [snapshots, setSnapshots] = useState<any[]>([])
        useEffect(() => {
            const load = () => {
                fetch('/api/moodle/snapshots')
                    .then(r => r.json())
                    .then(d => setSnapshots(d.snapshots || []))
            }
            load()
            const i = setInterval(load, 10000)
            return () => clearInterval(i)
        }, [])

        if (snapshots.length === 0) return (
            <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada siswa yang aktif dengan kamera
            </div>
        )

        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {snapshots.map((s, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
                        {s.image && (
                            <img src={s.image} alt={s.userName} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-white text-xs font-medium">{s.userName}</p>
                            <p className="text-white/60 text-xs">
                                {new Date(s.time).toLocaleTimeString('id-ID')}
                            </p>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-white text-xs">Live</span>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Proctoring</h1>
                    <p className="text-slate-500 text-sm mt-1">Monitor aktivitas ujian siswa</p>
                </div>
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                    LIVE
                </div>
            </div>

            {/* Live Camera Grid */}
            <div className="bg-white rounded-2xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">Live Kamera Siswa</h2>
                    <span className="flex items-center gap-1.5 text-xs text-green-600">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        Update tiap 10 detik
                    </span>
                </div>
                <LiveCamGrid />
            </div>

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
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {f === 'all' ? 'Semua' : f === 'inprogress' ? 'Berlangsung' : 'Selesai'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            setLoading(true)
                            fetch('/api/moodle/admin/attempts').then(r => r.json()).then(d => {
                                setAttempts(d.attempts || [])
                                setLoading(false)
                            })
                        }}
                        className="ml-auto text-xs text-violet-600 hover:underline"
                    >
                        Refresh
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
                            {filtered.map((a, i) => (
                                <tr key={i} className={`transition-colors ${a.state === 'inprogress' ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'
                                    }`}>
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
                {/* Violation Monitor */}
                <div className="bg-white rounded-2xl border border-slate-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800">Log Pelanggaran</h2>
                        <span className="text-xs text-slate-400">Auto-refresh 5 detik</span>
                    </div>
                    <ViolationMonitor />
                </div>
            </div>
        </div>
    )
}