'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ListSkeleton, FormSkeleton } from '@/components/admin/Skeleton'

interface Quiz {
  id: number
  name: string
  timelimit: number
  attempts: number
  timeopen: number
  timeclose: number
  password: string
  hasquestions: number
  intro: string
}

interface Course {
  id: number
  fullname: string
  shortname: string
}

export default function CourseQuizzesPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  
  const [course, setCourse] = useState<Course | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    intro: '',
    timeopen: '',
    timeclose: '',
    timelimit: '',
    attempts: '',
    password: '',
    shufflequestions: false,
  })

  useEffect(() => {
    if (courseId) fetchData()
  }, [courseId])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch course info  
      const courseRes = await fetch(`/api/moodle/courses?courseId=${courseId}`)
      const courseData = await courseRes.json()
      console.log('[fetchData] courseData:', courseData)
      setCourse(courseData.courses?.[0] || { id: Number(courseId), fullname: 'Course', shortname: '' })

      // Fetch quizzes - direct from public API for debugging
      const quizzesRes = await fetch(`/api/moodle/quizzes?courseId=${courseId}`)
      const quizzesData = await quizzesRes.json()
      console.log('[fetchData] quizzesData:', quizzesData)
      if (quizzesData.error) throw new Error(quizzesData.error)
      setQuizzes(quizzesData.quizzes || [])
    } catch (e: any) {
      console.error('[fetchData] error:', e.message)
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setMsg('Nama quiz wajib diisi')
      return
    }
    setSubmitting(true)
    setMsg('')
    try {
      const payload = {
        name: form.name,
        intro: form.intro,
        timeopen: form.timeopen ? Math.floor(new Date(form.timeopen).getTime() / 1000) : 0,
        timeclose: form.timeclose ? Math.floor(new Date(form.timeclose).getTime() / 1000) : 0,
        timelimit: form.timelimit ? Math.floor(Number(form.timelimit) * 60) : 0,
        attempts: form.attempts ? Number(form.attempts) : 0,
        password: form.password,
        shufflequestions: form.shufflequestions,
      }
      const r = await fetch(`/api/moodle/admin/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setMsg('Quiz berhasil dibuat!')
      setForm({
        name: '', intro: '', timeopen: '', timeclose: '', timelimit: '', attempts: '', password: '', shufflequestions: false,
      })
      setShowAdd(false)
      fetchData()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSubmitting(false)
    }
  }

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/quizzes" className="text-violet-500 hover:text-violet-600">
          Courses
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-300">{course?.fullname || 'Loading...'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Kelola Quiz</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {quizzes.length} quiz tersedia di course ini
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          + Tambah Quiz
        </button>
      </div>

      {/* Add Quiz Form */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Quiz Baru</h2>
          {msg && !msg.includes('berhasil') && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
              {msg}
            </div>
          )}
          {msg.includes('berhasil') && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm px-4 py-3 rounded-xl mb-4">
              {msg}
            </div>
          )}
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nama Quiz *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                placeholder="Contoh: Ujian Tengah Semester"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Deskripsi</label>
              <textarea
                value={form.intro}
                onChange={e => setForm({ ...form, intro: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white min-h-[80px]"
                placeholder="Petunjuk soal..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Waktu Mulai</label>
                <input
                  type="datetime-local"
                  value={form.timeopen}
                  onChange={e => setForm({ ...form, timeopen: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Waktu Tutup</label>
                <input
                  type="datetime-local"
                  value={form.timeclose}
                  onChange={e => setForm({ ...form, timeclose: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Batas Waktu (menit)</label>
                <input
                  type="number"
                  value={form.timelimit}
                  onChange={e => setForm({ ...form, timelimit: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Maks Attempt</label>
                <input
                  type="number"
                  value={form.attempts}
                  onChange={e => setForm({ ...form, attempts: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="0 = unlimited"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Password (opsional)</label>
              <input
                type="text"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                placeholder="Kosongkan jika tidak pakai password"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shuffle"
                checked={form.shufflequestions}
                onChange={e => setForm({ ...form, shufflequestions: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="shuffle" className="text-sm text-slate-600 dark:text-slate-400">
                Acak urutan soal
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all"
              >
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-slate-500 dark:text-slate-400 text-sm px-4 py-2.5"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quiz List */}
      {loading ? (
        <ListSkeleton count={3} />
      ) : quizzes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-400 dark:text-slate-500">Belum ada quiz di course ini.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map(quiz => (
            <div
              key={quiz.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:border-violet-300 dark:hover:border-violet-600 transition-all hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer group"
              onClick={() => router.push(`/admin/quizzes/${courseId}/${quiz.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-2 ${quiz.hasquestions ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {quiz.name}
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Waktu</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatTime(quiz.timelimit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Maks Attempt</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{quiz.attempts || 'Unlimited'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Dibuka</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(quiz.timeopen)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Ditutup</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(quiz.timeclose)}</p>
                      </div>
                    </div>
                    {quiz.password && (
                      <span className="inline-block mt-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                        🔒 Password
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}