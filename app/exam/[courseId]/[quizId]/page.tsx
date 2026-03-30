'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Proctoring from '@/components/exam/Proctoring'

interface Question {
  slot: number
  type: string
  number: number
  qtext: string
  qtextIsHtml: boolean
  choices: { value: string; label: string; hasImage: boolean }[]
  inputName: string
  maxmark: number
  previousAnswer?: string | null
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
  const [loading, setLoading] = useState(false)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [started, setStarted] = useState(false)
  const [violations, setViolations] = useState<string[]>([])
  const [quizPassword, setQuizPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [tabWarning, setTabWarning] = useState(false)
  const [sequencechecks, setSequencechecks] = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [hasActiveAttempt, setHasActiveAttempt] = useState(false)
  const [resuming, setResuming] = useState(false)
  const lastViolationRef = useRef(0)
  const ignoreFsRef = useRef(false)

  // Refs
  const attemptIdRef = useRef<number | null>(null)
  const answersRef = useRef<Record<string, string>>({})
  const sequencechecksRef = useRef<Record<string, string>>({})
  const quizPasswordRef = useRef('')
  const submittedRef = useRef(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Sync refs
  useEffect(() => { attemptIdRef.current = attemptId }, [attemptId])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { sequencechecksRef.current = sequencechecks }, [sequencechecks])
  useEffect(() => { quizPasswordRef.current = quizPassword }, [quizPassword])

  // ✅ FIX: Timer effect yang benar
  useEffect(() => {
    if (!started) return
    if (timeLeft <= 0) return // Quiz tanpa batas waktu

    // Clear interval lama kalau ada
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    // Set interval baru
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Waktu habis!
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
          if (!submittedRef.current) {
            submittedRef.current = true
            submitExam()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Cleanup
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [started, timeLeft])

  // Proctoring effects
  useEffect(() => {
    if (!started) return

    function onVisibility() {
      if (document.hidden) {
        addViolation(`Tab berpindah — ${new Date().toLocaleTimeString()}`)
        setTabWarning(true)
      }
    }

    function onFullscreenChange() {
      if (ignoreFsRef.current) return

      if (!document.fullscreenElement) {
        addViolation(`Keluar fullscreen — ${new Date().toLocaleTimeString()}`)
        setTabWarning(true)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
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

  // Helper: proses data soal
  function processExamData(data: any) {
    setQuiz(data.quiz)
    setQuestions(data.questions || [])
    setAttemptId(data.attemptId)
    attemptIdRef.current = data.attemptId

    // ✅ Gunakan timeLeft dari API
    const tl = data.timeLeft ?? 0
    console.log('[Exam] Time left:', tl)
    setTimeLeft(tl)
  }

  async function startExam() {
    setCheckingPassword(true)
    setPasswordError('')
    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch(`/api/moodle/quiz-start?quizId=${quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: quizPassword }),
      })
      const data = await res.json()

      if (res.status === 409 && data.error === 'ATTEMPT_IN_PROGRESS') {
        setHasActiveAttempt(true)
        setCheckingPassword(false)
        return
      }

      if (data.error) {
        setPasswordError('Password salah atau gagal memulai ujian.')
        setCheckingPassword(false)
        return
      }

      processExamData(data)
      document.documentElement.requestFullscreen().catch(() => { })
      setStarted(true)
    } catch {
      setPasswordError('Gagal memulai ujian, coba lagi.')
    }
    setCheckingPassword(false)
  }

  async function resumeExam() {
    setResuming(true)
    setPasswordError('')
    try {
      const token = localStorage.getItem('moodle_token')
      const res = await fetch(`/api/moodle/quiz-resume?quizId=${quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: quizPassword }),
      })
      const data = await res.json()

      if (data.error) {
        setPasswordError(data.error)
        setResuming(false)
        return
      }

      processExamData(data)
      document.documentElement.requestFullscreen().catch(() => { })
      setHasActiveAttempt(false)
      setStarted(true)
    } catch {
      setPasswordError('Gagal melanjutkan ujian, coba lagi.')
    }
    setResuming(false)
  }

  async function submitExam() {
    const currentAttemptId = attemptIdRef.current
    if (!currentAttemptId) return
    const token = localStorage.getItem('moodle_token')
    await fetch('/api/moodle/quiz-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        attemptId: currentAttemptId,
        answers: answersRef.current,
        password: quizPasswordRef.current,
        sequencechecks: sequencechecksRef.current,
      }),
    })
    router.push(`/exam/${courseId}/${quizId}/result?attemptId=${currentAttemptId}`)
  }

  async function handleSubmit() {
    if (submittedRef.current) return
    submittedRef.current = true
    await submitExam()
  }

  function formatTime(s: number) {
    if (s <= 0) return "00:00"
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const isWarning = timeLeft > 0 && timeLeft < 300
  const q = questions[current]

  function addViolation(msg: string) {
    const now = Date.now()
    if (now - lastViolationRef.current < 2000) return
    lastViolationRef.current = now
    setViolations(v => [...v, msg])
  }

  // ── Halaman login / password ──
  if (!started) return (
    <>
      {tabWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.90)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: '40px 32px',
            maxWidth: 400, width: '90%', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, background: '#FEF3C7', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
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
                ignoreFsRef.current = true

                try {
                  await document.documentElement.requestFullscreen()
                } catch {
                  try { await document.body.requestFullscreen() } catch { }
                }

                setTimeout(() => {
                  ignoreFsRef.current = false
                }, 1000)
              }}
              style={{
                width: '100%', background: '#7c3aed', color: 'white',
                border: 'none', borderRadius: 12, padding: '14px 24px',
                fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Klik untuk Lanjutkan (Fullscreen)
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
        style={{ pointerEvents: tabWarning ? 'none' : 'auto' }}>
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

            {hasActiveAttempt && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  🔄 Kamu memiliki ujian yang belum selesai
                </p>
                <p className="text-xs text-amber-700 mb-3">
                  Jawaban sebelumnya tetap tersimpan. Klik tombol di bawah untuk melanjutkan.
                </p>
                <button
                  onClick={resumeExam}
                  disabled={resuming}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                >
                  {resuming ? 'Memuat ujian...' : '▶ Lanjutkan Ujian'}
                </button>
                <button
                  onClick={() => setHasActiveAttempt(false)}
                  className="mt-2 text-xs text-amber-600 hover:underline"
                >
                  Kembali ke login
                </button>
              </div>
            )}

            {!hasActiveAttempt && (
              <>
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
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )

  // ── Halaman soal ──
  return (
    <main className="min-h-screen bg-slate-50">
      {tabWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.90)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: '40px 32px',
            maxWidth: 400, width: '90%', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, background: '#FEF3C7', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
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
                  try { await document.body.requestFullscreen() } catch { }
                }
              }}
              style={{
                width: '100%', background: '#7c3aed', color: 'white',
                border: 'none', borderRadius: 12, padding: '14px 24px',
                fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Klik untuk Lanjutkan (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: '36px 32px',
            maxWidth: 380, width: '90%', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, background: '#EDE9FE', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 26,
            }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
              Kumpulkan Ujian?
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>
              Kamu telah menjawab <strong>{Object.keys(answers).length}</strong> dari <strong>{questions.length}</strong> soal.
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>
              Jawaban tidak dapat diubah setelah dikumpulkan.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: '12px 0', border: '1px solid #e2e8f0',
                  borderRadius: 12, fontSize: 14, color: '#64748b',
                  background: 'white', cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit() }}
                style={{
                  flex: 1, padding: '12px 0', border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 500, color: 'white',
                  background: '#7c3aed', cursor: 'pointer',
                }}
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/favicon.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-medium text-slate-700 text-sm">{quiz?.name}</span>
        </div>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${isWarning ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-violet-50 text-violet-600 border border-violet-200'}`}>
          <span className={`w-2 h-2 rounded-full ${isWarning ? 'bg-red-500 animate-ping' : 'bg-violet-500'}`} />
          {formatTime(timeLeft)}
        </div>
        <button
          onClick={() => setShowConfirm(true)}
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
                {q.qtextIsHtml ? (
                  <div
                    className="text-slate-800 text-base leading-relaxed mb-6 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
                    dangerouslySetInnerHTML={{ __html: q.qtext }}
                  />
                ) : (
                  <p className="text-slate-800 text-base leading-relaxed mb-6">{q.qtext}</p>
                )}
                <div className="space-y-3">
                  {q.choices.map((choice) => (
                    <div
                      key={choice.value}
                      onClick={() => setAnswers(a => ({ ...a, [q.inputName]: choice.value }))}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${answers[q.inputName] === choice.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${answers[q.inputName] === choice.value
                        ? 'border-violet-500 bg-violet-500'
                        : 'border-slate-300'}`}>
                        {answers[q.inputName] === choice.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      {choice.hasImage ? (
                        <div
                          className="text-sm text-slate-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: choice.label }}
                        />
                      ) : (
                        <span className="text-sm text-slate-700">{choice.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Soal tidak tersedia</p>
            )}

            <div className="flex justify-between gap-3 mt-6">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kamera</p>
            <Proctoring
              onViolation={(msg) => {
                const lower = msg.toLowerCase()

                // ignore camera violation
                if (lower.includes('kamera') || lower.includes('camera') || lower.includes('webcam')) {
                  return
                }

                // prevent spam duplicate
                setViolations(v => {
                  if (v[v.length - 1] === msg) return v
                  return [...v, msg]
                })
              }}
            />
            {violations.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-red-600">{violations.length} pelanggaran</p>
                {violations.slice(-3).map((v, i) => (
                  <p key={i} className="text-xs text-slate-400">{v}</p>
                ))}
              </div>
            )}
          </div>

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
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
  )
} 