// @/app/api/moodle/quiz-submit/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token, attemptId, answers, password, sequencechecks } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  console.log('[quiz-submit] attemptId:', attemptId)
  console.log('[quiz-submit] answers count:', Object.keys(answers || {}).length)
  console.log('[quiz-submit] sequencechecks count:', Object.keys(sequencechecks || {}).length)

  if (!token || !attemptId) {
    return NextResponse.json({ error: 'Missing token or attemptId' }, { status: 400 })
  }

  try {
    function buildDataParams(
      params: URLSearchParams,
      answers: Record<string, string>,
      seqchecks: Record<string, string>
    ) {
      let i = 0
      Object.entries(answers || {}).forEach(([name, value]) => {
        params.set(`data[${i}][name]`, name)
        params.set(`data[${i}][value]`, String(value))
        i++
      })
      Object.entries(seqchecks || {}).forEach(([name, value]) => {
        params.set(`data[${i}][name]`, name)
        params.set(`data[${i}][value]`, String(value))
        i++
      })
      return i
    }

    // ── HELPER: Fetch sequencecheck terbaru dari Moodle ──
    // Dipanggil SETELAH save agar nilai seqcheck sudah diinkremen server
    async function fetchFreshSequencechecks(
      token: string,
      attemptId: number,
      password: string | undefined,
      oldSeqchecks: Record<string, string>
    ): Promise<Record<string, string>> {
      // Ambil semua slot yang dipakai dari key seqcheck lama
      // Format key: q124:3_:sequencecheck → slot = 3
      const slotSet = new Set<number>()
      Object.keys(oldSeqchecks).forEach(k => {
        const m = k.match(/q\d+:(\d+)_:sequencecheck/)
        if (m) slotSet.add(Number(m[1]))
      })

      // Moodle page layout: tiap page mungkin punya beberapa soal.
      // Kita fetch page=0 sampai page yang cukup untuk semua slot.
      // Strategi: fetch page 0..9 (max 10 halaman), kumpulkan seqcheck baru.
      const freshSeq: Record<string, string> = { ...oldSeqchecks }
      const maxPages = 15

      for (let page = 0; page < maxPages; page++) {
        const qParams = new URLSearchParams({
          wstoken: token,
          wsfunction: 'mod_quiz_get_attempt_data',
          moodlewsrestformat: 'json',
          attemptid: String(attemptId),
          page: String(page),
        })
        if (password) {
          qParams.set('preflightdata[0][name]', 'quizpassword')
          qParams.set('preflightdata[0][value]', password)
        }

        const res = await fetch(`${base}/webservice/rest/server.php`, {
          method: 'POST',
          body: qParams,
        })
        const data = await res.json()

        if (data.exception || !data.questions?.length) break

        let foundOnPage = 0
        for (const q of data.questions) {
          const html = q.html || ''
          // Ekstrak semua sequencecheck dari HTML soal
          const seqRegex = /name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/g
          let m
          while ((m = seqRegex.exec(html)) !== null) {
            const [, seqName, seqValue] = m
            if (freshSeq[seqName] !== undefined) {
              console.log(
                `[fetchFreshSeq] page=${page} ${seqName}: ${freshSeq[seqName]} → ${seqValue}`
              )
              freshSeq[seqName] = seqValue
              foundOnPage++
            }
          }
        }

        // Kalau sudah dapat semua slot, stop lebih awal
        if (Object.keys(freshSeq).length > 0 && foundOnPage === 0 && page > 0) break
      }

      return freshSeq
    }

    // ── LANGKAH 1: SAVE (finishattempt=0) ──
    const saveParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_process_attempt',
      moodlewsrestformat: 'json',
      attemptid: String(attemptId),
      finishattempt: '0',
    })
    if (password) {
      saveParams.set('preflightdata[0][name]', 'quizpassword')
      saveParams.set('preflightdata[0][value]', password)
    }
    const saveCount = buildDataParams(saveParams, answers, sequencechecks)
    console.log('[quiz-submit] SAVE sending', saveCount, 'data fields')

    const saveRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: saveParams,
    })
    const saveData = await saveRes.json()
    console.log('[quiz-submit] SAVE response:', JSON.stringify(saveData))

    if (saveData.exception) {
      if (saveData.errorcode === 'attemptalreadyclosed') {
        console.log('[quiz-submit] attempt already closed during save')
        return NextResponse.json({ success: true, alreadyClosed: true })
      }
      throw new Error(`Save gagal: ${saveData.message} (code: ${saveData.errorcode})`)
    }

    // ── LANGKAH 1.5: REFRESH sequencecheck setelah SAVE ──
    // Moodle menginkremen nilai seqcheck di server setiap kali data di-save.
    // Kalau kita kirim FINISH dengan nilai lama → "submissionoutofsequence" error.
    console.log('[quiz-submit] Fetching fresh sequencechecks after save...')
    const freshSequencechecks = await fetchFreshSequencechecks(
      token,
      attemptId,
      password,
      sequencechecks
    )
    console.log('[quiz-submit] freshSequencechecks:', JSON.stringify(freshSequencechecks))

    // ── LANGKAH 2: FINISH (finishattempt=1) dengan seqcheck terbaru ──
    const finishParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_process_attempt',
      moodlewsrestformat: 'json',
      attemptid: String(attemptId),
      finishattempt: '1',
    })
    if (password) {
      finishParams.set('preflightdata[0][name]', 'quizpassword')
      finishParams.set('preflightdata[0][value]', password)
    }
    // ✅ Pakai freshSequencechecks (sudah ter-update setelah SAVE)
    const finishCount = buildDataParams(finishParams, answers, freshSequencechecks)
    console.log('[quiz-submit] FINISH sending', finishCount, 'data fields')

    const finishRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: finishParams,
    })
    const finishData = await finishRes.json()
    console.log('[quiz-submit] FINISH response:', JSON.stringify(finishData))

    if (finishData.exception) {
      if (finishData.errorcode === 'attemptalreadyclosed') {
        return NextResponse.json({ success: true, alreadyClosed: true })
      }
      // ── Fallback: kalau masih out-of-sequence, coba FINISH tanpa data sama sekali ──
      // Moodle membolehkan finish tanpa data jika semua soal sudah tersimpan via SAVE.
      if (finishData.errorcode === 'submissionoutofsequencefriendlymessage') {
        console.warn('[quiz-submit] Still out-of-sequence, trying FINISH without data fields...')
        const finishFallbackParams = new URLSearchParams({
          wstoken: token,
          wsfunction: 'mod_quiz_process_attempt',
          moodlewsrestformat: 'json',
          attemptid: String(attemptId),
          finishattempt: '1',
        })
        if (password) {
          finishFallbackParams.set('preflightdata[0][name]', 'quizpassword')
          finishFallbackParams.set('preflightdata[0][value]', password)
        }
        const fallbackRes = await fetch(`${base}/webservice/rest/server.php`, {
          method: 'POST',
          body: finishFallbackParams,
        })
        const fallbackData = await fallbackRes.json()
        console.log('[quiz-submit] FINISH (fallback) response:', JSON.stringify(fallbackData))

        if (fallbackData.exception) {
          if (fallbackData.errorcode === 'attemptalreadyclosed') {
            return NextResponse.json({ success: true, alreadyClosed: true })
          }
          throw new Error(
            `Finish (fallback) gagal: ${fallbackData.message} (code: ${fallbackData.errorcode})`
          )
        }
        return NextResponse.json({ success: true, usedFallback: true })
      }

      throw new Error(`Finish gagal: ${finishData.message} (code: ${finishData.errorcode})`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[quiz-submit] ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}