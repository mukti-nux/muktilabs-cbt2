'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListSkeleton, StatsCardSkeleton } from '@/components/admin/Skeleton'

interface Course {
  id: number
  shortname: string
  fullname: string
  categoryid: number
  visible: number
  summary: string
}

export default function QuizzesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ name: '', shortname: '', categoryid: '1' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    setLoading(true)
    try {
      const r = await fetch('/api/moodle/admin/courses')
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setCourses(d.courses || [])
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.shortname) {
      setMsg('Nama dan shortname wajib diisi')
      return
    }
    setSubmitting(true)
    setMsg('')
    try {
      const r = await fetch('/api/moodle/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setMsg('Course berhasil dibuat!')
      setForm({ name: '', shortname: '', categoryid: '1' })
      setShowAdd(false)
      fetchCourses()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Kelola Course</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {courses.length} course tersedia
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          + Tambah Course
        </button>
      </div>

      {/* Add Course Form */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Course Baru</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Nama Course *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Contoh: Matematika Kelas X"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Shortname *
                </label>
                <input
                  type="text"
                  value={form.shortname}
                  onChange={e => setForm({ ...form, shortname: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Contoh: math-x"
                />
              </div>
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
                className="text-slate-500 dark:text-slate-400 text-sm px-4 py-2.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course List */}
      {loading ? (
        <ListSkeleton count={4} />
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-400 dark:text-slate-500">Belum ada course. Tambahkan course pertama!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map(course => (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:border-violet-300 dark:hover:border-violet-600 transition-all hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer group"
              onClick={() => router.push(`/admin/quizzes/${course.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    course.visible ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {course.fullname}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {course.shortname}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        ID: {course.id}
                      </span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                        Category: {course.categoryid}
                      </span>
                    </div>
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