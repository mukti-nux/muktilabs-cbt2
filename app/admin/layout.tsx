'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeProvider, useTheme } from '@/components/admin/ThemeProvider'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

function SidebarContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminName, setAdminName] = useState('')
  const { theme } = useTheme()

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col fixed h-full">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative rounded-lg overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill
                className="object-cover"
                onError={(e) => {
                  // Fallback to text if image fails
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">MuktiLabs CBT</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === item.href
                  ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{adminName}</p>
            <div className="flex items-center gap-2 mt-2">
              <ThemeToggle />
              <button
                onClick={() => { localStorage.clear(); router.push('/') }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ThemeProvider>
      <SidebarContent>{children}</SidebarContent>
    </ThemeProvider>
  )
}
