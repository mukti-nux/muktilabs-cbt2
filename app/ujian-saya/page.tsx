'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Exam {
  id: number
  fullname: string
  shortname: string
  status: 'belum' | 'sedang' | 'selesai'
  score?: number
}

export default function UjianSayaPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('moodle_user')
    const token = localStorage.getItem('moodle_token')

    if (!stored || !token) {
      router.push('/')
      return
    }

    const user = JSON.parse(stored)

    fetch(`/api/moodle/ujian-saya?userid=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setExams(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

  }, [router])

  const belum = exams.filter(e => e.status === 'belum')
  const sedang = exams.filter(e => e.status === 'sedang')
  const selesai = exams.filter(e => e.status === 'selesai')

  if (loading) {
    return (
      <div className="ml-60 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Memuat ujian...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ml-60 p-8 space-y-6 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-semibold">Ujian Saya</h1>
        <p className="text-violet-200 text-sm">
          Daftar ujian yang sudah dan belum dikerjakan
        </p>
      </div>

      <Section title="Belum Dikerjakan" data={belum} router={router} />
      <Section title="Sedang Dikerjakan" data={sedang} router={router} />
      <Section title="Sudah Dikerjakan" data={selesai} router={router} done />

    </div>
  )
}

function Section({ title, data, router, done=false }: any) {
  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3">{title}</h2>

      {data.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-400">
          Tidak ada ujian
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data.map((exam: any) => (
            <Card key={exam.id} exam={exam} router={router} done={done} />
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ exam, router, done }: any) {

  function getBadge() {
    if (exam.status === 'selesai')
      return 'bg-green-100 text-green-600'
    if (exam.status === 'sedang')
      return 'bg-amber-100 text-amber-600'
    return 'bg-violet-100 text-violet-600'
  }

  function getButton() {
    if (exam.status === 'selesai')
      return (
        <span className="text-sm font-semibold text-green-600">
          Nilai: {exam.score ?? '-'}
        </span>
      )

    if (exam.status === 'sedang')
      return (
        <button
          onClick={() => router.push(`/exam/${exam.id}`)}
          className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm hover:opacity-90"
        >
          Lanjutkan
        </button>
      )

    return (
      <button
        onClick={() => router.push(`/exam/${exam.id}`)}
        className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-4 py-2 rounded-xl text-sm hover:opacity-90"
      >
        Mulai Ujian
      </button>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-all">

      <div className="flex items-center justify-between mb-3">

        <div className="flex gap-3 items-center">
          <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center">
            <span className="text-violet-600 font-bold text-sm">
              {exam.shortname?.slice(0,3)?.toUpperCase()}
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800">
              {exam.fullname}
            </h3>
            <p className="text-xs text-slate-400">
              {exam.shortname}
            </p>
          </div>
        </div>

        <span className={`text-xs px-3 py-1 rounded-full ${getBadge()}`}>
          {exam.status}
        </span>

      </div>

      <div className="flex items-center justify-between">
        {getButton()}
      </div>

    </div>
  )
}