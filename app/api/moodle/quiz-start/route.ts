// /api/moodle/quiz-start/route.ts
// Fungsi gabungan (1+2) - optimal dengan gambar dan password
// + deteksi attempt yang sedang berjalan → kembalikan error ATTEMPT_IN_PROGRESS

import { NextResponse } from 'next/server'
import { moodleCall, proxifyMoodleImages } from '@/lib/moodle'

function parseQuestion(q: any) {
  const html = q.html || ''
  const base = process.env.NEXT_PUBLIC_MOODLE_URL || ''

  // Extract qtext HTML mentah dulu
  const qtextMatch = html.match(/<div class="qtext">([\s\S]*?)<\/div>/)
  const qtextRaw = qtextMatch ? qtextMatch[1] : ''
  
  // Proxify gambar
  const qtextProxified = proxifyMoodleImages(qtextRaw, base)
  
  // Cek apakah ada gambar
  const hasImage = qtextProxified.includes('<img')
  
  // Kalau ada gambar, pakai HTML. Kalau tidak, strip tag
  const qtext = hasImage 
    ? qtextProxified 
    : qtextRaw.replace(/<[^>]+>/g, '').trim()

  // Extract choices
  const choices: { value: string; label: string; hasImage: boolean }[] = []
  const answerRegex = /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?data-region="answer-label">([\s\S]*?)<\/div>\s*<\/div>/g
  let match
  while ((match = answerRegex.exec(html)) !== null) {
    const labelHtml = proxifyMoodleImages(match[2], base)
    const hasImgInChoice = labelHtml.includes('<img')
    choices.push({
      value: match[1],
      label: hasImgInChoice ? labelHtml : match[2].replace(/<[^>]+>/g, '').trim(),
      hasImage: hasImgInChoice
    })
  }

  const nameMatch = html.match(/name="(q\d+:\d+_answer)"/)
  const inputName = nameMatch ? nameMatch[1] : `q${q.slot}_answer`
  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)

  return {
    slot: q.slot,
    type: q.type,
    number: q.number,
    qtext,
    qtextIsHtml: hasImage,
    choices,
    inputName,
    seqName: seqMatch ? seqMatch[1] : null,
    seqValue: seqMatch ? seqMatch[2] : '1',
    maxmark: q.maxmark
  }
}