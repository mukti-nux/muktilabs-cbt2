// lib/moodle.ts

// Prioritas: MOODLE_URL (server-only, aman) → fallback NEXT_PUBLIC_MOODLE_URL
const BASE_URL = process.env.MOODLE_URL || process.env.NEXT_PUBLIC_MOODLE_URL
const TOKEN = process.env.MOODLE_TOKEN

if (!BASE_URL) {
  console.warn('[moodle] WARNING: MOODLE_URL / NEXT_PUBLIC_MOODLE_URL tidak diset di .env')
}

/**
 * Panggil Moodle Web Service.
 * - Tanpa token → pakai MOODLE_TOKEN (admin, server-side only)
 * - Dengan token → pakai token siswa (dari login)
 */
export async function moodleCall(
  wsfunction: string,
  params: Record<string, string> = {},
  token?: string
) {
  if (!BASE_URL) throw new Error('MOODLE_URL tidak dikonfigurasi di environment variables')

  const body = new URLSearchParams({
    wstoken: token || TOKEN!,
    wsfunction,
    moodlewsrestformat: 'json',
    ...params,
  })

  const res = await fetch(`${BASE_URL}/webservice/rest/server.php`, {
    method: 'POST',
    body,
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} dari Moodle WS`)

  const data = await res.json()
  if (data?.exception) throw new Error(`[${wsfunction}] ${data.message}`)
  return data
}

/** Ambil semua course (butuh admin token) */
export async function getCourses() {
  return moodleCall('core_course_get_courses')
}

/** Ambil quiz di satu course */
export async function getCourseQuizzes(courseId: number) {
  return moodleCall('mod_quiz_get_quizzes_by_courses', {
    'courseids[0]': String(courseId),
  })
}

/** Ambil course yang diikuti siswa (pakai token siswa) */
export async function getUserCourses(userId: string, token: string) {
  return moodleCall('core_enrol_get_users_courses', { userid: userId }, token)
}

/**
 * Proxify URL gambar Moodle supaya tidak kena CORS
 * Menangani:
 * - @@PLUGINFILE@@
 * - /pluginfile.php
 * - https://domain/pluginfile.php
 * 
 * ✅ FINAL: Selalu sertakan token untuk autentikasi
 */
export function proxifyMoodleImages(html: string, moodleBase: string, userToken: string): string {
  if (!html || !moodleBase || !userToken) return html

  return html.replace(/src="([^"]+)"/g, (_, src) => {
    let finalUrl = src

    // @@PLUGINFILE@@ → convert ke URL absolut
    if (src.includes('@@PLUGINFILE@@')) {
      finalUrl = src.replace('@@PLUGINFILE@@', `${moodleBase}/pluginfile.php`)
    }
    // relative /pluginfile.php → tambah base
    else if (src.startsWith('/pluginfile.php')) {
      finalUrl = `${moodleBase}${src}`
    }
    // absolute URL → biarkan
    else if (src.startsWith('http')) {
      finalUrl = src
    }

    // Hanya proxy jika pluginfile.php
    if (finalUrl.includes('pluginfile.php')) {
      // ✅ Sertakan token untuk autentikasi di proxy
      return `src="/api/moodle/image?url=${encodeURIComponent(finalUrl)}&token=${encodeURIComponent(userToken)}"`
    }

    return `src="${finalUrl}"`
  })
}