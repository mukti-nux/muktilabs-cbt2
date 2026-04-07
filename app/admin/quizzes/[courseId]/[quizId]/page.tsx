'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ListSkeleton, FormSkeleton, TableSkeleton } from '@/components/admin/Skeleton'

interface Question {
  id: number
  type: string
  name: string
  questiontext: string
  defaultmark: number
  answers?: { id: number; answer: string; fraction: number }[]
}

interface Quiz {
  id: number
  name: string
  timelimit: number
  attempts: number
  timeopen: number
  timeclose: number
  password: string
  hasquestions: number
  intro: string
}

const QUESTION_TYPES = [
  { value: 'multichoice', label: 'Multiple Choice', icon: '☑' },
  { value: 'truefalse', label: 'True/False', icon: '✓' },
  { value: 'shortanswer', label: 'Isian Singkat', icon: '✎' },
  { value: 'matching', label: 'Menjodohkan', icon: '↔' },
  { value: 'essay', label: 'Essay', icon: '📝' },
]

export default function QuizEditorPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const quizId = params.quizId as string
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'reports'>('questions')
  const [msg, setMsg] = useState('')
  
  // Add question state
  const [showAddQ, setShowAddQ] = useState(false)
  const [qForm, setQForm] = useState({
    questiontext: '',
    qtype: 'multichoice',
    defaultmark: '1',
    answer: '',
    answers: [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }],
  })
  const [submittingQ, setSubmittingQ] = useState(false)

  // Quiz settings state
  const [sForm, setSForm] = useState({
    name: '',
    intro: '',
    timeopen: '',
    timeclose: '',
    timelimit: '',
    attempts: '',
    password: '',
    shufflequestions: false,
    shuffleanswers: false,
    gradingsmethod: 'highest',
    preferredbehaviour: 'deferredfeedback',
  })
  const [submittingS, setSubmittingS] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  // Edit question state
  const [editingQ, setEditingQ] = useState<Question | null>(null)
  const [showEditQ, setShowEditQ] = useState(false)

  useEffect(() => {
    if (quizId) fetchData()
  }, [quizId])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch quiz info from correct endpoint
      const quizRes = await fetch(`/api/moodle/admin/quiz/${quizId}/settings`)
      const quizData = await quizRes.json()
      if (quizData.quiz) {
        setQuiz(quizData.quiz)
        setSForm({
          name: quizData.quiz.name || '',
          intro: quizData.quiz.intro || '',
          timeopen: quizData.quiz.timeopen ? new Date(quizData.quiz.timeopen * 1000).toISOString().slice(0, 16) : '',
          timeclose: quizData.quiz.timeclose ? new Date(quizData.quiz.timeclose * 1000).toISOString().slice(0, 16) : '',
          timelimit: quizData.quiz.timelimit ? String(Math.floor(quizData.quiz.timelimit / 60)) : '',
          attempts: String(quizData.quiz.attempts || ''),
          password: quizData.quiz.password || '',
          shufflequestions: quizData.quiz.shufflequestions === 1,
          shuffleanswers: quizData.quiz.shuffleanswers === 1,
          gradingsmethod: quizData.quiz.gradingsmethod || 'highest',
          preferredbehaviour: quizData.quiz.preferredbehaviour || 'deferredfeedback',
        })
      }

      // Fetch questions using correct API
      const qRes = await fetch(`/api/moodle/admin/quiz/${quizId}/questions`)
      const qData = await qRes.json()
      setQuestions(qData.questions || [])
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingS(true)
    setSettingsMsg('')
    try {
      const r = await fetch(`/api/moodle/admin/quiz/${quizId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sForm),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSettingsMsg('Pengaturan berhasil disimpan!')
      fetchData()
    } catch (e: any) {
      setSettingsMsg(e.message)
    } finally {
      setSubmittingS(false)
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!qForm.questiontext) {
      setMsg('Pertanyaan wajib diisi')
      return
    }
    setSubmittingQ(true)
    setMsg('')
    try {
      const payload = {
        questiontext: qForm.questiontext,
        qtype: qForm.qtype,
        defaultmark: Number(qForm.defaultmark),
        answer: qForm.answer,
        answers: qForm.answers,
      }
      const r = await fetch(`/api/moodle/admin/quiz/${quizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setMsg('Soal berhasil ditambahkan!')
      setQForm({
        questiontext: '',
        qtype: 'multichoice',
        defaultmark: '1',
        answer: '',
        answers: [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }],
      })
      setShowAddQ(false)
      fetchData()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSubmittingQ(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/quizzes" className="text-violet-500 hover:text-violet-600">Courses</Link>
        <span className="text-slate-400">/</span>
        <Link href={`/admin/quizzes/${courseId}`} className="text-violet-500 hover:text-violet-600">Course</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-300">{quiz?.name || 'Loading...'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">{quiz?.name || 'Quiz Editor'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {questions.length} soal · {quiz?.hasquestions || 0} sudah diatur
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/quizzes/${courseId}/${quizId}/reports`)}
            className="text-sm px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            📊 Laporan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['questions', 'settings', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${
              activeTab === tab
                ? 'bg-violet-600 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'questions' ? '❓ Soal' : tab === 'settings' ? '⚙️ Pengaturan' : '📊 Laporan'}
          </button>
        ))}
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddQ(!showAddQ)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:scale-105"
            >
              + Tambah Soal
            </button>
          </div>

          {/* Add Question Form */}
          {showAddQ && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Soal Baru</h2>
              {msg && !msg.includes('berhasil') && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>
              )}
              {msg.includes('berhasil') && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>
              )}
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tipe Soal</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {QUESTION_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setQForm({ ...qForm, qtype: t.value })}
                        className={`p-3 rounded-xl border text-sm text-center transition-all ${
                          qForm.qtype === t.value
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-lg mb-1">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Pertanyaan *</label>
                  <textarea
                    value={qForm.questiontext}
                    onChange={e => setQForm({ ...qForm, questiontext: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white min-h-[100px]"
                    placeholder="Ketik pertanyaan..."
                  />
                </div>
                {qForm.qtype === 'multichoice' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Jawaban</label>
                    <div className="space-y-2">
                      {qForm.answers.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={a.correct}
                            onChange={e => {
                              const newAnswers = [...qForm.answers]
                              newAnswers[i] = { ...newAnswers[i], correct: e.target.checked }
                              setQForm({ ...qForm, answers: newAnswers })
                            }}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={a.text}
                            onChange={e => {
                              const newAnswers = [...qForm.answers]
                              newAnswers[i] = { ...newAnswers[i], text: e.target.value }
                              setQForm({ ...qForm, answers: newAnswers })
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                            placeholder={`Jawaban ${i + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {qForm.qtype === 'truefalse' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Jawaban Benar</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setQForm({ ...qForm, answer: 'true' })}
                        className={`px-4 py-2 rounded-lg border ${
                          qForm.answer === 'true'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        ✓ True
                      </button>
                      <button
                        type="button"
                        onClick={() => setQForm({ ...qForm, answer: 'false' })}
                        className={`px-4 py-2 rounded-lg border ${
                          qForm.answer === 'false'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        ✗ False
                      </button>
                    </div>
                  </div>
                )}
                {['shortanswer', 'essay'].includes(qForm.qtype) && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Poin</label>
                    <input
                      type="number"
                      value={qForm.defaultmark}
                      onChange={e => setQForm({ ...qForm, defaultmark: e.target.value })}
                      className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submittingQ}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl"
                  >
                    {submittingQ ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button type="button" onClick={() => setShowAddQ(false)} className="text-slate-500 text-sm px-4 py-2.5">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Questions List */}
          {loading ? (
            <ListSkeleton count={3} />
          ) : questions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-400 dark:text-slate-500">Belum ada soal. Tambahkan soal pertama!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:border-violet-300 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {q.type}
                        </span>
                        <span className="text-xs text-slate-400">{q.defaultmark} poin</span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-white line-clamp-2">{q.questiontext}</p>
                    </div>
                    <button className="text-slate-400 hover:text-violet-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Pengaturan Quiz</h2>
          
          {settingsMsg && (
            <div className={`text-sm px-4 py-3 rounded-xl mb-4 ${settingsMsg.includes('berhasil') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
              {settingsMsg}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nama Quiz</label>
              <input
                type="text"
                value={sForm.name}
                onChange={e => setSForm({ ...sForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Deskripsi / Intro</label>
              <textarea
                value={sForm.intro}
                onChange={e => setSForm({ ...sForm, intro: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 min-h-[80px]"
                placeholder="Deskripsi quiz (opsional)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Batas Waktu (menit)</label>
              <input
                type="number"
                value={sForm.timelimit}
                onChange={e => setSForm({ ...sForm, timelimit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                placeholder="0 = tanpa batas"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Maks Attempt</label>
              <input
                type="number"
                value={sForm.attempts}
                onChange={e => setSForm({ ...sForm, attempts: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                placeholder="0 = unlimited"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Waktu Mulai</label>
              <input
                type="datetime-local"
                value={sForm.timeopen}
                onChange={e => setSForm({ ...sForm, timeopen: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Waktu Tutup</label>
              <input
                type="datetime-local"
                value={sForm.timeclose}
                onChange={e => setSForm({ ...sForm, timeclose: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Password</label>
              <input
                type="text"
                value={sForm.password}
                onChange={e => setSForm({ ...sForm, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                placeholder="Kosongkan jika tidak pakai"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Metode Penilaian</label>
              <select
                value={sForm.gradingsmethod}
                onChange={e => setSForm({ ...sForm, gradingsmethod: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              >
                <option value="highest">Highest Grade</option>
                <option value="average">Average Grade</option>
                <option value="first">First Attempt</option>
                <option value="last">Last Attempt</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Opsi Tambahan</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sForm.shufflequestions}
                    onChange={e => setSForm({ ...sForm, shufflequestions: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Acak Soal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sForm.shuffleanswers}
                    onChange={e => setSForm({ ...sForm, shuffleanswers: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Acak Jawaban</span>
                </label>
              </div>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={submittingS}
            className="mt-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            {submittingS ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
          </button>
        </form>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-center py-12">
            <p className="text-slate-400 dark:text-slate-500 mb-4">Buka halaman laporan untuk melihat statistik dan export</p>
            <button
              onClick={() => router.push(`/admin/quizzes/${courseId}/${quizId}/reports`)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl"
            >
              📊 Lihat Laporan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}