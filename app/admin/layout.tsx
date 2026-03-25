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
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col fixed h-full shadow-sm">
        
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">MuktiLabs CBT</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm 
                  transition-all duration-200
                  ${active
                    ? 'bg-violet-100 text-violet-700 font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
                  }
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <p className="text-xs font-medium text-slate-700 truncate">{adminName}</p>
            <button
              onClick={() => { localStorage.clear(); router.push('/') }}
              className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>

    </div>
  )
}