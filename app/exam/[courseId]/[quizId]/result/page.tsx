'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'

interface Review {
  grade: number
  maxgrade: number
  sumgrades: number
  timefinish: number
  timestart: number
}

export default function ResultPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attemptId')
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  

  useEffect(() => {
    const token = localStorage.getItem('moodle_token')
    if (!token || !attemptId) { router.push('/dashboard'); return }

    fetch(`/api/moodle/quiz-result?attemptId=${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(r => r.json())
      .then(d => { setReview(d); setLoading(false) })
  }, [attemptId, router])

  function formatDuration(start: number, finish: number) {
    const diff = finish - start
    const m = Math.floor(diff / 60)
    const s = diff % 60
    return `${m} menit ${s} detik`
  }

  function getGradeColor(pct: number) {
    if (pct >= 80) return 'text-green-600'
    if (pct >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  function getGradeLabel(pct: number) {
    if (pct >= 80) return 'Sangat Baik'
    if (pct >= 70) return 'Baik'
    if (pct >= 60) return 'Cukup'
    return 'Perlu Perbaikan'
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Menghitung nilai...</p>
    </div>
  )

  const pct = review ? Math.round((review.sumgrades / review.maxgrade) * 100) : 0

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-6">
        <div>
          <div className={`text-6xl font-bold mb-2 ${review ? getGradeColor(pct) : 'text-slate-300'}`}>
            {pct}%
          </div>
          <p className="text-slate-500 text-sm">{review ? getGradeLabel(pct) : ''}</p>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {review && (
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Nilai</p>
              <p className="text-lg font-bold text-slate-800">
                {Number(review.sumgrades).toFixed(1)} / {Number(review.maxgrade).toFixed(1)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Durasi</p>
              <p className="text-lg font-bold text-slate-800">
                {formatDuration(review.timestart, review.timefinish)}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </main>
  )
}