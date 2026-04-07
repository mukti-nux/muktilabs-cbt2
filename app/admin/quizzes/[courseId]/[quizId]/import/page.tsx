'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ParsedQuestion {
  question: string
  answers: { text: string; correct: boolean }[]
  type: string
}

export default function ImportQuestionsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const quizId = params.quizId as string
  
  const [content, setContent] = useState('')
  const [parsed, setParsed] = useState<ParsedQuestion[]>([])
  const [format, setFormat] = useState<'aiken' | 'moodle' | 'gift'>('aiken')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(0)

  // AIKEN format parser
  function parseAiken(text: string): ParsedQuestion[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    const questions: ParsedQuestion[] = []
    let currentQ: ParsedQuestion | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Question starts with ANSWER: prefix
      if (line.startsWith('ANSWER:')) {
        if (currentQ) {
          // Mark correct answer
          const answer = line.replace('ANSWER:', '').trim().toUpperCase()
          currentQ.answers = currentQ.answers.map(a => ({
            ...a,
            correct: a.text.toUpperCase() === answer,
          }))
          questions.push(currentQ)
        }
        currentQ = null
        continue
      }
      
      // If line starts with letter + dot (A. B. C. etc), it's an answer choice
      if (/^[A-Z]\.\s/.test(line) && currentQ) {
        currentQ.answers.push({
          text: line.replace(/^[A-Z]\.\s*/, '').trim(),
          correct: false,
        })
      } else if (!line.startsWith('ANSWER:') && !currentQ) {
        // New question
        currentQ = {
          question: line,
          answers: [],
          type: 'multichoice',
        }
      } else if (currentQ && !/^[A-Z]\.\s/.test(line)) {
        // Continue question text
        currentQ.question += ' ' + line
      }
    }

    return questions.filter(q => q.answers.length > 0)
  }

  // GIFT format parser (simplified)
  function parseGift(text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = []
    const blocks = text.split(/={,}/).filter(b => b.trim())
    
    for (const block of blocks) {
      const qTextMatch = block.match(/^[^{]*/)
      const qText = qTextMatch ? qTextMatch[0].trim() : ''
      
      // Find correct answers ( = )
      const answers: { text: string; correct: boolean }[] = []
      const answerMatches = block.match(/~=[^~]+/g) || []
      const correctMatch = block.match(/=[^~]+/g)
      
      for (const a of answerMatches) {
        answers.push({
          text: a.replace('~=', '').trim(),
          correct: false,
        })
      }
      
      if (correctMatch && answers.length > 0) {
        const correctText = correctMatch[0].replace('=', '').trim()
        for (const a of answers) {
          if (a.text.toUpperCase() === correctText.toUpperCase()) {
            a.correct = true
            break
          }
        }
      }

      if (qText && answers.length > 0) {
        questions.push({
          question: qText,
          answers,
          type: 'multichoice',
        })
      }
    }
    
    return questions
  }

  function handleParse() {
    setMsg('')
    setParsed([])
    
    if (!content.trim()) {
      setMsg('Masukkan pertanyaan terlebih dahulu')
      return
    }

    try {
      const questions = format === 'aiken' ? parseAiken(content) : parseGift(content)
      
      if (questions.length === 0) {
        setMsg('Tidak dapat mem-parse pertanyaan. Periksa format.')
        return
      }

      setParsed(questions)
      setMsg(`Berhasil parse ${questions.length} pertanyaan`)
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    }
  }

  async function handleImport() {
    if (parsed.length === 0) return
    
    setLoading(true)
    setMsg('')
    let success = 0

    try {
      for (const q of parsed) {
        const r = await fetch(`/api/moodle/admin/quiz/${quizId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questiontext: q.question,
            qtype: q.type,
            defaultmark: 1,
            answers: q.answers,
          }),
        })
        const d = await r.json()
        if (!d.error) success++
      }
      
      setImported(success)
      setMsg(`Berhasil import ${success}/${parsed.length} pertanyaan`)
      setParsed([])
      setContent('')
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/quizzes" className="text-violet-500 hover:text-violet-600">Courses</Link>
        <span className="text-slate-400">/</span>
        <Link href={`/admin/quizzes/${courseId}`} className="text-violet-500 hover:text-violet-600">Quiz</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-300">Import</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Import Pertanyaan</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Import pertanyaan dari format AIKEN, GIFT, atau Moodle XML
        </p>
      </div>

      {/* Format Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Pilih Format</h2>
        <div className="flex gap-2 mb-4">
          {(['aiken', 'moodle', 'gift'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                format === f
                  ? 'bg-violet-600 text-white'
                  : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-400">
          {format === 'aiken' && (
            <pre className="whitespace-pre-wrap font-mono text-xs">
{`Contoh Format AIKEN:
What is the capital of France?
A. Paris
B. London
C. Berlin
D. Madrid
ANSWER: A`}
            </pre>
          )}
          {format === 'gift' && (
            <pre className="whitespace-pre-wrap font-mono text-xs">
{`Contoh Format GIFT:
What is 2+2?{~=4#Correct~=3#Wrong}
::Q2::Question?{=Correct~%50%Partially correct}`}
            </pre>
          )}
        </div>
      </div>

      {/* Text Input */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Paste Pertanyaan</h2>
        {msg && !msg.includes('berhasil') && !msg.includes('parse') && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>
        )}
        {msg.includes('berhasil') && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full h-64 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono text-sm"
          placeholder="Paste pertanyaan di sini..."
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleParse}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl"
          >
            Parse
          </button>
        </div>
      </div>

      {/* Parsed Preview */}
      {parsed.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              Preview ({parsed.length} pertanyaan)
            </h2>
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl"
            >
              {loading ? 'Mengimport...' : 'Import Semua'}
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {parsed.map((q, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{i + 1}. {q.question}</p>
                <div className="mt-2 space-y-1">
                  {q.answers.map((a, j) => (
                    <div key={j} className={`text-xs px-2 py-1 rounded ${
                      a.correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-slate-500'
                    }`}>
                      {a.correct ? '✓' : '○'} {a.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {imported > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl">
          ✓ Berhasil import {imported} pertanyaan!
        </div>
      )}
    </div>
  )
}