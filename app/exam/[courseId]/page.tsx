'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Quiz {
  id: number
  name: string
  intro: string
  timelimit: number
  attempts: number
  sumgrades: number
}

export default function ExamListPage() {
  const router = useRouter()
  const { courseId } = useParams()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [courseName, setCourseName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('moodle_token')
    if (!token) { router.push('/'); return }

    fetch(`/api/moodle/quizzes?courseId=${courseId}`)
      .then(r => r.json())
      .then(data => {
        setQuizzes(data.quizzes || [])
        setCourseName(data.courseName || '')
        setLoading(false)
      })
  }, [courseId, router])

  function formatTime(seconds: number) {
    if (!seconds) return 'Tidak dibatasi'
    const m = Math.floor(seconds / 60)
    return `${m} menit`
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Memuat daftar ujian...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600 text-sm">
          ← Kembali
        </button>
        <div className="w-px h-4 bg-slate-200" />
        <span className="font-semibold text-slate-800 text-sm">{courseName}</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800">Daftar Ujian</h1>
          <p className="text-slate-500 text-sm mt-1">{quizzes.length} ujian tersedia</p>
        </div>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">Belum ada ujian di kursus ini</p>
            <p className="text-slate-300 text-xs mt-2">Buat quiz di Moodle terlebih dahulu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map(quiz => (
              <div
                key={quiz.id}
                onClick={() => router.push(`/exam/${courseId}/${quiz.id}/lobby`)}
                className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all group flex items-center justify-between"
              >
                <div>
                  <h2 className="font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                    {quiz.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400">
                      ⏱ {formatTime(quiz.timelimit)}
                    </span>
                    <span className="text-xs text-slate-400">
                      📝 {quiz.sumgrades} poin
                    </span>
                  </div>
                </div>
                <div className="bg-violet-50 text-violet-600 text-xs font-medium px-4 py-2 rounded-full group-hover:bg-violet-600 group-hover:text-white transition-all">
                  Mulai →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}