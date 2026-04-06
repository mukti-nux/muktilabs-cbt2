'use client'
import { useEffect, useState, useRef } from 'react'

interface User {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  lastaccess: number
  suspended: number
  enrolledCourses: number
  activeAttempts: number
}

interface Course {
  id: number
  fullname: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', firstname: '', lastname: '', email: '', password: '' })
  const [importStatus, setImportStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [enrollCourse, setEnrollCourse] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ambil data dari Moodle
  useEffect(() => {
    fetchUsers()
    fetchCourses()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch('/api/moodle/admin/users', {
        headers: { 'x-token': token || '' }
      })
      const data = await res.json()
      if (data.users) {
        // Transform data untuk menampilkan status
        const now = Math.floor(Date.now() / 1000)
        const transformed = data.users.map((u: any) => ({
          id: u.id,
          username: u.username,
          firstname: u.firstname || '',
          lastname: u.lastname || '',
          email: u.email || '',
          lastaccess: u.lastaccess || 0,
          suspended: u.suspended || 0,
          enrolledCourses: u.enrolledCourses || 0,
          activeAttempts: u.activeAttempts || 0,
        }))
        setUsers(transformed)
      }
    } catch (e) {
      console.error('Error fetching users:', e)
    }
    setLoading(false)
  }

  async function fetchCourses() {
    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch('/api/moodle/courses', {
        headers: { 'x-token': token || '' }
      })
      const data = await res.json()
      setCourses(data.filter((c: Course) => c.id !== 1) || [])
    } catch (e) {
      console.error('Error fetching courses:', e)
    }
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.firstname.toLowerCase().includes(search.toLowerCase()) ||
      u.lastname.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    
    const isActive = u.lastaccess > 0 && (Date.now() / 1000 - u.lastaccess) < 86400 * 7 // aktif dalam 7 hari
    const matchFilter = filter === 'all' || 
      (filter === 'active' && isActive) || 
      (filter === 'inactive' && !isActive)
    
    return matchSearch && matchFilter
  })

  // Tambah user manual
  async function handleCreateUser() {
    if (!newUser.username || !newUser.email) return
    
    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch('/api/moodle/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-token': token || '' },
        body: JSON.stringify(newUser)
      })
      const data = await res.json()
      
      if (data.success) {
        setShowModal(false)
        setNewUser({ username: '', firstname: '', lastname: '', email: '', password: '' })
        fetchUsers()
      } else {
        alert(data.error || 'Gagal membuat user')
      }
    } catch (e) {
      alert('Terjadi kesalahan')
    }
  }

  // Import Excel
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch('/api/moodle/admin/users/import', {
        method: 'POST',
        headers: { 'x-token': token || '' },
        body: formData
      })
      const data = await res.json()
      
      setImportStatus({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || []
      })
      
      if (data.success > 0) {
        fetchUsers()
      }
    } catch (e) {
      setImportStatus({ success: 0, failed: 0, errors: ['Terjadi kesalahan saat import'] })
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Enroll user ke course
  async function handleEnroll() {
    if (!enrollCourse || selectedUsers.length === 0) return

    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch('/api/moodle/admin/users/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-token': token || '' },
        body: JSON.stringify({ userIds: selectedUsers, courseId: enrollCourse })
      })
      const data = await res.json()
      
      if (data.success) {
        alert(`Berhasil mendaftarkan ${data.enrolled} user ke kursus`)
        setShowEnrollModal(false)
        setSelectedUsers([])
        setEnrollCourse('')
        fetchUsers()
      } else {
        alert(data.error || 'Gagal mendaftarkan user')
      }
    } catch (e) {
      alert('Terjadi kesalahan')
    }
  }

  // Toggle select user
  function toggleSelectUser(userId: number) {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Select all
  function toggleSelectAll() {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  function formatLastAccess(timestamp: number) {
    if (!timestamp) return 'Belum pernah'
    const diff = Date.now() / 1000 - timestamp
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
    return new Date(timestamp * 1000).toLocaleDateString('id-ID')
  }

  function isActive(lastaccess: number) {
    if (!lastaccess) return false
    return (Date.now() / 1000 - lastaccess) < 86400 * 7
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Manajemen Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} pengguna terdaftar</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm text-white font-medium transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah User
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari pengguna..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-64"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : 'Tidak Aktif'}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="ml-auto flex items-center gap-3 bg-violet-50 border border-violet-200 px-4 py-2 rounded-xl">
            <span className="text-xs text-violet-700 font-medium">{selectedUsers.length} dipilih</span>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              Enroll ke Kursus
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Batal
            </button>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={fetchUsers}
          className="text-xs text-violet-600 hover:underline"
        >
          Refresh ↻
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Memuat data...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Tidak ada pengguna ditemukan</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Pengguna</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Terakhir Aktif</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Kursus</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Ujian Aktif</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700">
                        {((user.firstname || user.username).charAt(0) + (user.lastname || '').charAt(0)).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">
                          {user.firstname} {user.lastname}
                        </p>
                        <p className="text-xs text-slate-400">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatLastAccess(user.lastaccess)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-full font-medium">
                      {user.enrolledCourses}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.activeAttempts > 0 ? (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">
                        {user.activeAttempts} aktif
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isActive(user.lastaccess)
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isActive(user.lastaccess) ? 'bg-green-500' : 'bg-slate-400'
                      }`} />
                      {isActive(user.lastaccess) ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tambah User */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Tambah User Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="username"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Depan</label>
                  <input
                    type="text"
                    value={newUser.firstname}
                    onChange={e => setNewUser({ ...newUser, firstname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Belakang</label>
                  <input
                    type="text"
                    value={newUser.lastname}
                    onChange={e => setNewUser({ ...newUser, lastname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Kosongkan untuk auto-generate"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.username || !newUser.email}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Import User dari Excel</h2>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-2">Format Kolom Excel:</p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>• username (wajib)</p>
                <p>• password</p>
                <p>• firstname</p>
                <p>• lastname</p>
                <p>• email (wajib)</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 file:cursor-pointer"
            />

            {importStatus && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs">
                <p className="text-green-600 font-medium">Berhasil: {importStatus.success}</p>
                <p className="text-red-600">Gagal: {importStatus.failed}</p>
                {importStatus.errors.length > 0 && (
                  <div className="mt-2 text-slate-500">
                    {importStatus.errors.slice(0, 3).map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowImportModal(false); setImportStatus(null) }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enroll */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Enroll {selectedUsers.length} User ke Kursus
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kursus</label>
              <select
                value={enrollCourse}
                onChange={e => setEnrollCourse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Pilih kursus...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.fullname}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEnroll}
                disabled={!enrollCourse}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Enroll Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}