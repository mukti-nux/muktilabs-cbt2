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
  const [time, setTime] = useState(new Date())
  const [stats, setStats] = useState({ selesai: 0, avgDuration: '-' })

  useEffect(() => {
    const stored = localStorage.getItem('moodle_user')
    const token = localStorage.getItem('moodle_token')
    if (!stored || !token) { router.push('/'); return }

    const user = JSON.parse(stored)
    if (!user || !user.id) { router.push('/'); return }

    setUser(user)

    fetch('/api/moodle/courses')
      .then(r => r.json())
      .then(data => {
        setCourses(data.filter((c: Course) => c.id !== 1))
        setLoading(false)
      })

    fetch(`/api/moodle/my-quizzes?userId=${user.id}`, {
      headers: { 'x-token': token }
    })
      .then(r => r.json())
      .then(d => {
        const quizzes = d.quizzes || []
        const finished = quizzes.filter((q: any) => q.attempt?.state === 'finished')

        let avgDuration = '-'
        if (finished.length > 0) {
          const totalMins = finished.reduce((sum: number, q: any) => {
            const diff = (q.attempt.timefinish - q.attempt.timestart) / 60
            return sum + diff
          }, 0)
          const avg = Math.round(totalMins / finished.length)
          avgDuration = `${avg} menit`
        }

        setStats({ selesai: finished.length, avgDuration })
      })
      .catch(() => { })
  }, [router])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function logout() {
    localStorage.clear()
    router.push('/')
  }

  function getGreeting() {
    const h = time.getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  function getCalendarDays() {
    const year = time.getFullYear()
    const month = time.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const adjusted = firstDay === 0 ? 6 : firstDay - 1
    const cells = []
    for (let i = 0; i < adjusted; i++) cells.push(null)
    for (let i = 1; i <= daysInMonth; i++) cells.push(i)
    return cells
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Memuat dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-slate-100 flex flex-col z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img
                src="/favicon.png"
                alt="logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">MuktiLabs CBT</p>
              <p className="text-xs text-slate-400">Portal Ujian</p>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">Peserta Ujian</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="px-3 py-2.5 rounded-xl bg-violet-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="white" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>
            </div>
            <span className="text-sm font-medium text-violet-700">Dashboard</span>
          </div>
          <div
            onClick={() => router.push('/ujian-saya')}
            className="px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path fill="#94a3b8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm text-slate-600">Ujian Saya</span>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 hover:bg-red-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </div>
            <span className="text-sm text-slate-500 group-hover:text-red-600 transition-colors">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 p-8">
        {/* Header greeting */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm mb-1">{days[time.getDay()]}, {time.getDate()} {months[time.getMonth()]} {time.getFullYear()}</p>
              <h1 className="text-2xl font-semibold text-slate-800">
                {getGreeting()}, <span className="text-violet-600">{user?.name?.split(' ')[0]}</span> 👋
              </h1>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-right">
              <p className="text-2xl font-bold text-slate-800 tabular-nums">
                {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Waktu sekarang</p>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="white" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{courses.length}</p>
            <p className="text-violet-200 text-sm">Mata Pelajaran</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#f59e0b" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">-</p>
            <p className="text-slate-400 text-sm">Rata-rata Waktu</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#22c55e" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">-</p>
            <p className="text-slate-400 text-sm">Ujian Selesai</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Daftar ujian */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Ujian Tersedia</h2>
              <span className="text-xs text-slate-400">{courses.length} mata pelajaran</span>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#94a3b8" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <p className="text-slate-500 text-sm">Belum ada ujian tersedia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => router.push(`/exam/${course.id}`)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-violet-50 group-hover:bg-violet-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                        <span className="text-violet-600 font-bold text-sm">
                          {course.shortname.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 mb-0.5 truncate">{course.fullname}</h3>
                        <p className="text-xs text-slate-400">{course.shortname}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs bg-violet-50 text-violet-600 px-3 py-1.5 rounded-full font-medium group-hover:bg-violet-600 group-hover:text-white transition-all">
                          Mulai Ujian
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kalender */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 text-sm">
                  {months[time.getMonth()]} {time.getFullYear()}
                </h3>
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path fill="white" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {getCalendarDays().map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${day === null ? '' :
                      day === time.getDate()
                        ? 'bg-violet-600 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div className="mt-4 bg-violet-50 border border-violet-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path fill="white" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs font-semibold text-violet-800">Perhatian</p>
              </div>
              <p className="text-xs text-violet-700 leading-relaxed">
                Pastikan kamera dan koneksi internet stabil sebelum memulai ujian. Pelanggaran akan dicatat otomatis.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}