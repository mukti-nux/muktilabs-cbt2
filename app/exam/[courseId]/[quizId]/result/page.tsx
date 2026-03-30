// @/app/exam/[courseId]/[quizId]/result/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'

interface Review {
  grade: number       // nilai final sudah diskala (misal 8.5 dari maxgrade 10)
  maxgrade: number    // nilai maksimal (misal 10 atau 100)
  sumgrades: number   // sama dengan grade (sudah difix di route)
  rawSumgrades: number       // raw score soal (opsional, untuk debug)
  rawMaxSumgrades: number    // raw max soal (opsional, untuk debug)
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('moodle_token')
    if (!token || !attemptId) { router.push('/dashboard'); return }

    fetch(`/api/moodle/quiz-result?attemptId=${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
        } else {
          setReview(d)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Gagal mengambil hasil ujian.')
        setLoading(false)
      })
  }, [attemptId, router])

  function formatDuration(start: number, finish: number) {
    if (!start || !finish || finish <= start) return '-'
    const diff = finish - start
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    if (h > 0) return `${h} jam ${m} menit`
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
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Menghitung nilai...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-600 font-medium">Gagal mengambil nilai</p>
        <p className="text-slate-400 text-sm">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  )

  // ✅ FIX kalkulasi pct:
  // grade sudah dalam skala maxgrade → (grade / maxgrade) * 100
  // Contoh: grade=8.5, maxgrade=10 → 85%
  // Contoh: grade=85, maxgrade=100 → 85%
  const pct = review
    ? Math.min(100, Math.round((review.grade / review.maxgrade) * 100))
    : 0

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
                {/* ✅ Tampilkan grade/maxgrade, bukan sumgrades/maxgrade */}
                {Number(review.grade).toFixed(1)} / {Number(review.maxgrade).toFixed(1)}
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