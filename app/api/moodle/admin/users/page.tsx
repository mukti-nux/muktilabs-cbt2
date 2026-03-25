'use client'
import { useEffect, useState } from 'react'

interface User {
  id: number
  fullname: string
  email: string
  username: string
  lastaccess: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', username: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/moodle/admin/userlist')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false) })
  }, [])

  async function addUser() {
    setSaving(true)
    const res = await fetch('/api/moodle/admin/userlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const d = await res.json()
    if (d.error) { setMsg('Gagal: ' + d.error) }
    else {
      setMsg('Akun berhasil dibuat!')
      setShowAdd(false)
      setForm({ firstname: '', lastname: '', email: '', username: '', password: '' })
      fetch('/api/moodle/admin/userlist').then(r => r.json()).then(d => setUsers(d.users || []))
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const filtered = users.filter(u =>
    u.fullname.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} akun terdaftar</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Tambah Akun
        </button>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${msg.includes('Gagal') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {msg}
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Tambah Akun Baru</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'firstname', label: 'Nama Depan' },
              { key: 'lastname', label: 'Nama Belakang' },
              { key: 'email', label: 'Email' },
              { key: 'username', label: 'Username' },
              { key: 'password', label: 'Password' },
            ].map(f => (
              <div key={f.key} className={f.key === 'email' ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                <input
                  type={f.key === 'password' ? 'password' : 'text'}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={addUser} disabled={saving} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Memuat...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(u => (
              <div key={u.id} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700">
                    {u.fullname.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{u.fullname}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {u.lastaccess ? `Terakhir: ${new Date(u.lastaccess * 1000).toLocaleDateString('id-ID')}` : 'Belum pernah login'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}