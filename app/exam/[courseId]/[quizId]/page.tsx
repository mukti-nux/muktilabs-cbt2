'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Proctoring from '@/components/exam/Proctoring'
import { useCallback } from 'react'

interface Question {
  slot: number
  type: string
  number: number
  qtext: string
  choices: { value: string; label: string }[]
  inputName: string
  maxmark: number
}

interface QuizInfo {
  name: string
  timelimit: number
}

export default function ExamPage() {
  const router = useRouter()
  const { courseId, quizId } = useParams()
  const [quiz, setQuiz] = useState<QuizInfo | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [started, setStarted] = useState(false)
  const [violations, setViolations] = useState<string[]>([])
  const [quizPassword, setQuizPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [tabWarning, setTabWarning] = useState(false)
  const [sequencechecks, setSequencechecks] = useState<Record<string, string>>({})

  const reportViolation = useCallback((type: string) => {
    const user = JSON.parse(localStorage.getItem('moodle_user') || '{}')
    fetch('/api/moodle/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        attemptId,
        type,
        time: new Date().toLocaleTimeString()
      })
    }).catch(() => { })
  }, [attemptId])


  useEffect(() => {
    if (!started) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [started])

  useEffect(() => {
    if (!started) return

    function onVisibility() {
      if (document.hidden) {
        const msg = `Tab berpindah — ${new Date().toLocaleTimeString()}`
        setViolations(v => [...v, msg])
        setTabWarning(true)
        reportViolation('Tab berpindah')
      }
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        const msg = `Keluar fullscreen — ${new Date().toLocaleTimeString()}`
        setViolations(v => [...v, msg])
        setTabWarning(true)
        reportViolation('Keluar fullscreen')
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      // Blokir Escape, F11, Alt+Tab, Alt+F4
      if (e.key === 'Escape' || e.key === 'F11') {
        e.preventDefault()
        setTabWarning(true)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [started])

  async function startExam() {
    setCheckingPassword(true)
    setPasswordError('')
    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch(`/api/moodle/quiz-start?quizId=${quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: quizPassword })
      })
      const data = await res.json()
      if (data.error) {
        setPasswordError('Password salah, coba lagi.')
        setCheckingPassword(false)
        return
      }
      setQuiz(data.quiz)
      setQuestions(data.questions || [])
      setAttemptId(data.attemptId)
      setTimeLeft(data.quiz?.timelimit || 5400)

      // Simpan semua sequencecheck dari soal
      const seqChecks: Record<string, string> = {}
      data.questions.forEach((q: any) => {
        if (q.seqName) seqChecks[q.seqName] = q.seqValue
      })
      setSequencechecks(seqChecks)

      document.documentElement.requestFullscreen().catch(() => { })
      setStarted(true)
    } catch {
      setPasswordError('Gagal memulai ujian, coba lagi.')
    }
    setCheckingPassword(false)
  }

  async function handleSubmit() {
    if (!attemptId) return
    const token = localStorage.getItem('moodle_token')
    await fetch('/api/moodle/quiz-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, attemptId, answers, password: quizPassword, sequencechecks })
    })
    router.push(`/exam/${courseId}/${quizId}/result?attemptId=${attemptId}`)
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const isWarning = timeLeft > 0 && timeLeft < 300
  console.log('tabWarning state:', tabWarning)
  const q = questions[current]

  return (
    <>
      {tabWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.90)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: '40px 32px',
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64,
              background: '#FEF3C7',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32
            }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
              Pelanggaran Terdeteksi!
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
              Kamu keluar dari halaman ujian atau meninggalkan fullscreen.
            </p>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 500, marginBottom: 28 }}>
              Pelanggaran ke-{violations.length} telah dicatat operator
            </p>
            <button
              onClick={async () => {
                setTabWarning(false)
                try {
                  await document.documentElement.requestFullscreen()
                } catch {
                  try {
                    await document.body.requestFullscreen()
                  } catch { }
                }
              }}
              style={{
                width: '100%',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Klik untuk Lanjutkan (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {!started ? (
        <main
          className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
          style={{ pointerEvents: tabWarning ? 'none' : 'auto' }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800 mb-1">Ujian</h1>
              <p className="text-slate-400 text-sm">Masukkan password untuk memulai</p>
            </div>

            <div className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Ujian</label>
                <input
                  type="password"
                  value={quizPassword}
                  onChange={e => setQuizPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startExam()}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Masukkan password dari guru"
                  autoFocus
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Ujian berjalan dalam mode fullscreen</li>
                  <li>Kamera akan diaktifkan untuk proctoring</li>
                  <li>Perpindahan tab akan dicatat</li>
                </ul>
              </div>
              <button
                onClick={startExam}
                disabled={!quizPassword || checkingPassword}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
              >
                {checkingPassword ? 'Memverifikasi...' : 'Mulai Ujian'}
              </button>
              <button onClick={() => router.back()} className="w-full text-sm text-slate-400 hover:text-slate-600 py-2">
                Kembali
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="min-h-screen bg-slate-50">
          {/* Topbar */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              <span className="font-medium text-slate-700 text-sm">{quiz?.name}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${isWarning ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-violet-50 text-violet-600 border border-violet-200'
              }`}>
              <span className={`w-2 h-2 rounded-full ${isWarning ? 'bg-red-500 animate-ping' : 'bg-violet-500'}`} />
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => { if (confirm('Yakin ingin mengumpulkan ujian?')) handleSubmit() }}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Kumpulkan
            </button>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Soal utama */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                    Soal {current + 1} dari {questions.length}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-violet-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {q ? (
                  <div>
                    <p className="text-slate-800 text-base leading-relaxed mb-6">{q.qtext}</p>
                    <div className="space-y-3">
                      {q.choices.map((choice) => (
                        <div
                          key={choice.value}
                          onClick={() => setAnswers(a => ({ ...a, [q.inputName]: choice.value }))}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${answers[q.inputName] === choice.value
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${answers[q.inputName] === choice.value
                            ? 'border-violet-500 bg-violet-500'
                            : 'border-slate-300'
                            }`}>
                            {answers[q.inputName] === choice.value && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm text-slate-700">{choice.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Soal tidak tersedia</p>
                )}
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  disabled={current === questions.length - 1}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm text-white font-medium disabled:opacity-40 transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Kamera proctoring */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kamera</p>
                <Proctoring onViolation={(msg) => setViolations(v => [...v, msg])} />
                {violations.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-red-600">{violations.length} pelanggaran</p>
                    {violations.slice(-3).map((v, i) => (
                      <p key={i} className="text-xs text-slate-400">{v}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigasi soal */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Navigasi soal</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`aspect-square rounded-lg text-xs font-medium transition-all ${i === current ? 'bg-violet-600 text-white' :
                        answers[questions[i]?.inputName] !== undefined
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded bg-violet-600" /> Saat ini
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded bg-violet-100" /> Dijawab
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded bg-slate-100" /> Belum
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  )
}