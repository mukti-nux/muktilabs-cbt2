'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Snapshot {
  key: string
  userId: number
  userName: string
  attemptId: number
  image: string
  time: string
}

export default function LivePage() {
  const router = useRouter()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selected, setSelected] = useState<Snapshot | null>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const load = () => {
      fetch('/api/moodle/snapshots')
        .then(r => r.json())
        .then(d => setSnapshots(d.snapshots || []))
    }
    load()
    const i = setInterval(load, 8000)
    return () => clearInterval(i)
  }, [])

  function selectStudent(snap: Snapshot) {
    setSelected(snap)
    fetch(`/api/moodle/snapshots?key=${snap.key}`)
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Kembali
          </button>
          <div className="w-px h-4 bg-slate-700" />
          <h1 className="text-white font-semibold">Live Monitor</h1>
          <span className="flex items-center gap-1.5 bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
            {snapshots.length} aktif
          </span>
        </div>
        <p className="text-slate-500 text-xs">Auto-refresh tiap 5 detik</p>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Belum ada siswa yang aktif</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {snapshots.map((snap, i) => (
            <div
              key={i}
              onClick={() => selectStudent(snap)}
              className={`relative rounded-xl overflow-hidden cursor-pointer transition-all ${
                selected?.key === snap.key
                  ? 'ring-2 ring-violet-400 scale-105'
                  : 'hover:ring-1 hover:ring-white/30'
              }`}
            >
              <div className="aspect-video bg-slate-800">
                {snap.image ? (
                  <img src={snap.image} alt={snap.userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-slate-600 text-xs">Tidak ada gambar</span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{snap.userName}</p>
                <p className="text-white/50 text-xs">{new Date(snap.time).toLocaleTimeString('id-ID')}</p>
              </div>
              <div className="absolute top-1.5 right-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full block animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side panel detail siswa */}
      {selected && (
        <div
          style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 50 }}
          className="bg-slate-900 border-l border-slate-700 flex flex-col"
        >
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">{selected.userName}</p>
              <p className="text-slate-400 text-xs">Attempt {selected.attemptId}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">x</button>
          </div>

          <div className="p-3">
            <div className="rounded-lg overflow-hidden aspect-video bg-slate-800 mb-3">
              <img src={selected.image} alt="latest" className="w-full h-full object-cover" />
            </div>
            <p className="text-slate-400 text-xs mb-3">Screenshot terbaru</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
              History ({history.length})
            </p>
            <div className="space-y-2">
              {history.slice().reverse().map((h, i) => (
                <div
                  key={i}
                  onClick={() => setSelected({ ...selected, image: h.image })}
                  className="rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-violet-400 transition-all"
                >
                  <img src={h.image} alt={`h-${i}`} className="w-full aspect-video object-cover" />
                  <p className="text-slate-500 text-xs p-1">
                    {new Date(h.time).toLocaleTimeString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}