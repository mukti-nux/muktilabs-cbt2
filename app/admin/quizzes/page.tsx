'use client'
import { useEffect, useState } from 'react'

interface Quiz {
  id: number
  name: string
  timelimit: number
  attempts: number
  sumgrades: number
  timeopen: number
  timeclose: number
  password: string
  hasquestions: number
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Quiz | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/moodle/quizzes?courseId=4')
      .then(r => r.json())
      .then(d => { setQuizzes(d.quizzes || []); setLoading(false) })
  }, [])

  function formatTime(s: number) {
    if (!s) return 'Tidak dibatasi'
    return `${Math.floor(s / 60)} menit`
  }

  function formatDate(ts: number) {
    if (!ts) return '-'
    return new Date(ts * 1000).toLocaleString('id-ID')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Kelola Quiz</h1>
          <p className="text-slate-500 text-sm mt-1">{quizzes.length} quiz tersedia</p>
        </div>
        <a
          href="https://lms.muktilabs.my.id"
          target="_blank"
          rel="noreferrer"
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Buat Quiz di Moodle →
        </a>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          msg.includes('Gagal') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Memuat...
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 p-6">
              {editing?.id === quiz.id ? (
                // Edit mode — langsung ke Moodle karena API edit quiz terbatas
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Edit quiz dilakukan langsung di Moodle untuk menjaga integritas data.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={`https://lms.muktilabs.my.id/mod/quiz/edit.php?cmid=${quiz.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors"
                    >
                      Buka di Moodle →
                    </a>
                    <button
                      onClick={() => setEditing(null)}
                      className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${quiz.hasquestions ? 'bg-green-400' : 'bg-slate-300'}`} />
                      <h2 className="font-semibold text-slate-800">{quiz.name}</h2>
                      {quiz.password && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          🔒 Password
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Waktu</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{formatTime(quiz.timelimit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Maks attempt</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{quiz.attempts || 'Tidak terbatas'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Dibuka</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDate(quiz.timeopen)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Ditutup</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDate(quiz.timeclose)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditing(quiz)}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                    <a
                      href={`https://lms.muktilabs.my.id/mod/quiz/report.php?id=${quiz.id}&mode=overview`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                    >
                      Hasil
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
