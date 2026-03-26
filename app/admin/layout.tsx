'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('moodle_user')
    if (!user) { router.push('/'); return }
    setAdminName(JSON.parse(user).name)
  }, [router])

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/admin/proctoring', label: 'Proctoring', icon: '◉' },
    { href: '/admin/quizzes', label: 'Kelola Quiz', icon: '✎' },
    { href: '/admin/users', label: 'Pengguna', icon: '◎' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col fixed h-full">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">MuktiLabs CBT</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-violet-50 text-violet-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2.5 rounded-xl bg-slate-50">
            <p className="text-xs font-medium text-slate-700 truncate">{adminName}</p>
            <button
              onClick={() => { localStorage.clear(); router.push('/') }}
              className="text-xs text-red-400 hover:text-red-600 mt-0.5 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  )
}