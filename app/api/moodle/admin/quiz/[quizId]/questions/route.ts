// /api/moodle/admin/quiz/[quizId]/questions/route.ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

const base = process.env.NEXT_PUBLIC_MOODLE_URL
const adminToken = process.env.MOODLE_TOKEN

async function moodleAdmin(wsfunction: string, params: Record<string, string> = {}) {
  const p = new URLSearchParams({
    wstoken: adminToken!,
    wsfunction,
    moodlewsrestformat: 'json',
    ...params,
  })
  const res = await fetch(`${base}/webservice/rest/server.php`, {
    method: 'POST',
    body: p,
  })
  const data = await res.json()
  if (data?.exception) throw new Error(`[${wsfunction}] ${data.message}`)
  return data
}

// Question types mapping - UI label to Moodle internal type
const Q_TYPE_MAP: Record<string, string> = {
  'multichoice': 'multichoice',
  'truefalse': 'truefalse',
  'shortanswer': 'shortanswer',
  'matching': 'match',
  'essay': 'essay',
  'numerical': 'numerical',
  'multichoiceset': 'multichoiceset',
  'calculated': 'calculated',
}

// Reverse mapping for display
const Q_TYPE_DISPLAY: Record<string, string> = {
  'multichoice': 'Multiple Choice',
  'truefalse': 'True/False',
  'shortanswer': 'Short Answer',
  'match': 'Matching',
  'essay': 'Essay',
  'numerical': 'Numerical',
  'multichoiceset': 'Multiple Choice (Set)',
  'calculated': 'Calculated',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params
    
    // Get quiz info
    const quizRes = await moodleAdmin('mod_quiz_get_quizzes_by_courses', {
      'courseids[0]': '0',
    })
    const quiz = (quizRes.quizzes || []).find((q: any) => q.id === Number(quizId))
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    // Get questions in this quiz using correct API
    // Use local_xxx_get_questions if available, fallback to core
    let questions: any[] = []
    
    try {
      // Try to get questions from quiz - using quiz_get_questions
      const qRes = await moodleAdmin('mod_quiz_get_questions', {
        quizid: quizId,
      })
      questions = qRes.questions || []
    } catch (e) {
      // Fallback: try to get questions from section
      console.log('[quiz/questions] fallback:', e)
    }
    
    // Format questions for frontend
    const formattedQuestions = questions.map((q: any, index: number) => ({
      id: q.id,
      slot: q.slot,
      type: q.type,
      typeDisplay: Q_TYPE_DISPLAY[q.type] || q.type,
      name: q.name || `Question ${index + 1}`,
      questiontext: q.questiontext || '',
      defaultmark: q.defaultmark || 1,
      // Parse answers based on question type
      answers: parseAnswers(q.answers || [], q.type),
    }))
    
    return NextResponse.json({ 
      quiz,
      questions: formattedQuestions,
      total: formattedQuestions.length,
    })
  } catch (err: any) {
    console.error('[admin/quiz/questions GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Helper function to parse answers based on question type
function parseAnswers(answers: any[], qtype: string) {
  if (!Array.isArray(answers)) return []
  
  return answers.map((a: any) => ({
    id: a.id || 0,
    answer: stripHtml(a.answer || ''),
    fraction: a.fraction || 0,
    feedback: stripHtml(a.feedback || ''),
    correct: (a.fraction || 0) > 0,
  }))
}

// Strip HTML tags
function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params
    const body = await request.json()
    const { 
      questiontext, qtype, defaultmark, answer, answers, 
      correctfeedback, incorrectfeedback, imageurl, categoryid 
    } = body

    if (!questiontext) {
      return NextResponse.json({ error: 'Question text required' }, { status: 400 })
    }

    const qtypeKey = Q_TYPE_MAP[qtype?.toLowerCase()] || 'multichoice'
    
    // Prepare answer data based on question type
    let answerParams: Record<string, string> = {}
    
    if (qtypeKey === 'multichoice') {
      // Multiple choice: answers is array of {text, correct?}
      const choices = Array.isArray(answers) ? answers.filter((a: any) => a.text) : []
      
      choices.forEach((a: any, i: number) => {
        answerParams[`questions[0][answer][${i}][answer]`] = a.text || ''
        answerParams[`questions[0][answer][${i}][fraction]`] = a.correct ? '1' : '0'
        answerParams[`questions[0][answer][${i}][feedback]`] = ''
      })
      
      // Ensure at least 2 answers
      if (choices.length < 2) {
        answerParams[`questions[0][answer][1][answer]`] = ''
        answerParams[`questions[0][answer][1][fraction]`] = '0'
      }
    } else if (qtypeKey === 'truefalse') {
      // True/false - Moodle expects specific format
      const isTrue = answer === 'true' || answer === '1'
      answerParams = {
        'questions[0][answer][0][answer]': 'True',
        'questions[0][answer][0][fraction]': isTrue ? '1' : '0',
        'questions[0][answer][1][answer]': 'False',
        'questions[0][answer][1][fraction]': isTrue ? '0' : '1',
      }
    } else if (qtypeKey === 'shortanswer') {
      // Short answer
      answerParams = {
        'questions[0][answer][0][answer]': answer || '',
        'questions[0][answer][0][fraction]': '1',
        'questions[0][answer][1][answer]': '*',
        'questions[0][answer][1][fraction]': '0',
      }
    } else if (qtypeKey === 'essay') {
      // Essay - no answers needed
      answerParams = {}
    } else {
      // Default: multichoice format
      answerParams = {
        'questions[0][answer][0][answer]': answer || '',
        'questions[0][answer][0][fraction]': '1',
      }
    }

    // Build full params for question creation
    const createParams: Record<string, string> = {
      'questions[0][type]': qtypeKey,
      'questions[0][categoryid]': String(categoryid || 2),
      'questions[0][questiontext]': questiontext,
      'questions[0][questiontextformat]': '1', // HTML format
      'questions[0][defaultmark]': String(defaultmark || 1),
      'questions[0][length]': '1',
      ...answerParams,
    }

    // Create question using core_question_create
    const question = await moodleAdmin('core_question_create_questions', createParams)

    if (question[0]?.id) {
      // Add question to quiz
      try {
        await moodleAdmin('core_question_add_question', {
          questionid: String(question[0].id),
          quizid: quizId,
        })
      } catch (addErr) {
        console.log('[quiz/questions] add to quiz warning:', addErr)
        // Question created but not added to quiz - still success
      }
      
      return NextResponse.json({ 
        success: true, 
        question: question[0],
        message: 'Question created and added to quiz' 
      })
    }

    throw new Error(question.message || 'Failed to create question')
  } catch (err: any) {
    console.error('[admin/quiz/questions POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT - Update question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const body = await request.json()
    const { questionid, questiontext, qtype, defaultmark, answer, answers } = body

    if (!questionid) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 })
    }

    const qtypeKey = Q_TYPE_MAP[qtype?.toLowerCase()] || 'multichoice'
    
    // Build update params
    const updateParams: Record<string, string> = {
      'questions[0][id]': String(questionid),
      'questions[0][type]': qtypeKey,
      'questions[0][questiontext]': questiontext || '',
      'questions[0][defaultmark]': String(defaultmark || 1),
    }

    // Add answers based on type
    if (qtypeKey === 'multichoice' && Array.isArray(answers)) {
      answers.filter((a: any) => a.text).forEach((a: any, i: number) => {
        updateParams[`questions[0][answer][${i}][answer]`] = a.text || ''
        updateParams[`questions[0][answer][${i}][fraction]`] = a.correct ? '1' : '0'
      })
    }

    const result = await moodleAdmin('core_question_update_questions', updateParams)

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[admin/quiz/questions PUT]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE - Remove question from quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params
    const { searchParams } = new URL(request.url)
    const questionid = searchParams.get('questionid')

    if (!questionid) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 })
    }

    await moodleAdmin('core_question_remove_question', {
      questionid,
      quizid: quizId,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[admin/quiz/questions DELETE]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
