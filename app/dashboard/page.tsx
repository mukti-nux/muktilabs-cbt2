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
  const [stats, setStats] = useState({
    activeCount: 0,
    nearestDeadline: '-',
    averageScore: '-'
  })

  // Mock checking admin role, basic check if we want to redirect to admin
  // For actual production use claims inside JWT token
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
        const now = Math.floor(Date.now() / 1000)

        const activeCount = quizzes.filter((q: any) => {
          const isAccessible = now >= q.timeopen && now <= q.timeclose
          const notFinished = q.attempt?.state !== 'finished'
          return isAccessible && notFinished
        }).length

        const upcoming = quizzes
          .filter((q: any) => {
            const notFinished = q.attempt?.state !== 'finished'
            const notExpired = q.timeclose > now
            return notFinished && notExpired && q.timeclose > 0
          })
          .sort((a: any, b: any) => a.timeclose - b.timeclose)

        let nearestDeadline = '-'
        if (upcoming[0]?.timeclose) {
          const diffSeconds = upcoming[0].timeclose - now
          if (diffSeconds < 3600) {
            const mins = Math.ceil(diffSeconds / 60)
            nearestDeadline = `${mins} menit`
          } else if (diffSeconds < 86400) {
            const hours = Math.ceil(diffSeconds / 3600)
            nearestDeadline = `${hours} jam`
          } else {
            const days = Math.ceil(diffSeconds / 86400)
            nearestDeadline = `${days} hari`
          }
        }

        const finished = quizzes.filter((q: any) =>
          q.attempt?.state === 'finished' &&
          q.attempt?.sumgrades != null &&
          q.maxgrade > 0
        )

        let averageScore = '-'
        if (finished.length > 0) {
          const avg = finished.reduce((sum: number, q: any) => {
            const percentage = (q.attempt.sumgrades / q.maxgrade) * 100
            return sum + percentage
          }, 0) / finished.length
          averageScore = Math.round(avg).toString()
        }

        setStats({ activeCount, nearestDeadline, averageScore })
      })

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
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-violet-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Menyiapkan Ruang Ujian...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Premium Sidebar with Glassmorphism */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all">
        {/* Logo Area */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 tracking-tight">MuktiLabs CBT</p>
              <p className="text-xs text-violet-600 font-medium">Portal Siswa</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-5 py-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 flex items-center justify-center text-sm font-bold text-violet-700 shadow-sm border border-white">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500">Peserta Ujian</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          <div className="px-4 py-3 rounded-2xl bg-violet-600 shadow-md shadow-violet-500/20 flex items-center gap-3 transform transition-transform hover:scale-[1.02] cursor-pointer">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-sm font-semibold text-white">Dashboard Utama</span>
          </div>
          <div
            onClick={() => router.push('/ujian-saya')}
            className="px-4 py-3 rounded-2xl flex items-center gap-3 cursor-pointer group hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all text-slate-600 hover:text-violet-600"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="text-slate-400 group-hover:text-violet-500 transition-colors">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-medium">Ujian Saya</span>
          </div>
        </nav>

        {/* Action Button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full px-4 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-white bg-slate-100 hover:bg-red-500 transition-all duration-300 group"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="group-hover:-translate-x-1 transition-transform">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="ml-64 flex-1 p-8 xl:p-12 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <p className="text-violet-600 font-medium text-sm mb-2 opacity-90">{days[time.getDay()]}, {time.getDate()} {months[time.getMonth()]} {time.getFullYear()}</p>
              <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
                {getGreeting()}, <br className="hidden md:block" /> <span className="text-violet-600">{user?.name?.split(' ')[0]}</span>
              </h1>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-3xl px-6 py-4 shadow-sm inline-flex flex-col items-end transform hover:scale-105 transition-transform duration-300">
              <p className="text-3xl font-extrabold text-slate-800 tabular-nums tracking-tighter">
                {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Waktu Realtime</p>
              </div>
            </div>
          </div>

          {/* Interactive Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-violet-500/20 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-600/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
              </div>
              <p className="text-4xl font-extrabold mb-1 tracking-tight">{courses.length}</p>
              <p className="text-violet-200 text-sm font-medium">Mata Pelajaran Aktif</p>
            </div>

            <div className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100/50 rounded-2xl flex items-center justify-center transform group-hover:-rotate-12 transition-transform duration-300">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              <p className="text-4xl font-extrabold text-slate-800 mb-1 tracking-tight">{stats.nearestDeadline}</p>
              <p className="text-slate-500 text-sm font-medium">Batas Waktu Terdekat</p>
            </div>

            <div className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100/50 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              <p className="text-4xl font-extrabold text-slate-800 mb-1 tracking-tight">{stats.activeCount}</p>
              <p className="text-slate-500 text-sm font-medium">Ujian Menunggu Dikerjakan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            {/* Exam List Section */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between mb-2 border-b border-slate-200/60 pb-3">
                <h2 className="text-xl font-bold text-slate-800">Ujian Tersedia</h2>
                <div className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full">
                  {courses.length} Ujian
                </div>
              </div>

              {courses.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-12 text-center shadow-sm">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">Gak Ada Ujian Aktif</h3>
                  <p className="text-slate-500 text-sm">Santai dulu! Belum ada ujian yang ditugaskan ke kamu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.map(course => (
                    <div
                      key={course.id}
                      onClick={() => router.push(`/exam/${course.id}`)}
                      className="group bg-white rounded-3xl border border-slate-100 p-5 cursor-pointer hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-50 group-hover:bg-violet-600 rounded-2xl flex items-center justify-center transition-colors duration-300 flex-shrink-0">
                          <span className="text-slate-500 group-hover:text-white font-bold text-sm transition-colors duration-300">
                            {course.shortname.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 mb-1 truncate group-hover:text-violet-700 transition-colors">{course.fullname}</h3>
                          <p className="text-xs text-slate-400 font-medium">Batas Waktu: Hari ini 23:59</p>
                        </div>
                      </div>
                      <div className="w-full flex items-center justify-center py-2.5 rounded-xl bg-slate-50 text-slate-600 text-sm font-semibold group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                        Mulai Kerjakan
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar & Notices Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">
                    {months[time.getMonth()]} {time.getFullYear()}
                  </h3>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                </div>

                <div className="grid grid-cols-7 mb-3">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays().map((day, i) => (
                    <div
                      key={i}
                      className={`relative aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all duration-200 cursor-default ${
                        day === null ? '' :
                        day === time.getDate()
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30 font-bold scale-110 z-10'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                        }`}
                    >
                      {day}
                      {/* Add subtle indicator dot for exam active days (mock usage) */}
                      {day !== null && day > time.getDate() && day < time.getDate() + 3 && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/20 group">
                {/* Background Decoration */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-400/30 rounded-full blur-xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="font-bold text-white tracking-wide">Pusat Perhatian</p>
                  </div>
                  <p className="text-sm text-indigo-100 leading-relaxed">
                    Sistem ujian dipantau secara otomatis (AI Proctoring). Pastikan kamera dan koneksi internet stabil. Pelanggaran tersimpan permanen.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}