'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Course {
  id: number
  fullname: string
  shortname: string
  summary: string
}

interface User {
  id: number
  name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('moodle_user')
    const token = localStorage.getItem('moodle_token')
    if (!stored || !token) { router.push('/'); return }
    setUser(JSON.parse(stored))

    fetch('/api/moodle/courses')
      .then(r => r.json())
      .then(data => {
        setCourses(data.filter((c: Course) => c.id !== 1))
        setLoading(false)
      })
  }, [router])

  function logout() {
    localStorage.clear()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Memuat dashboard...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <span className="font-semibold text-slate-800">MuktiLabs CBT</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Halo, <strong>{user?.name}</strong></span>
          <button onClick={logout} className="text-sm text-slate-400 hover:text-red-500 transition-colors">
            Keluar
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800">Ujian Tersedia</h1>
          <p className="text-slate-500 text-sm mt-1">Pilih mata pelajaran untuk memulai ujian</p>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400">Belum ada kursus tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map(course => (
              <div
                key={course.id}
                onClick={() => router.push(`/exam/${course.id}`)}
                className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
                  <span className="text-violet-600 font-bold text-sm">
                    {course.shortname.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <h2 className="font-semibold text-slate-800 mb-1">{course.fullname}</h2>
                <p className="text-xs text-slate-400 mb-4">{course.shortname}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium">
                    Lihat Ujian →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}