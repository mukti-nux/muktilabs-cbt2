const BASE_URL = process.env.NEXT_PUBLIC_MOODLE_URL
const TOKEN = process.env.MOODLE_TOKEN

export async function moodleCall(wsfunction: string, params: Record<string, string> = {}, token?: string) {
  const url = new URL(`${BASE_URL}/webservice/rest/server.php`)
  url.searchParams.set('wstoken', token || TOKEN!)
  url.searchParams.set('wsfunction', wsfunction)
  url.searchParams.set('moodlewsrestformat', 'json')
  
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  const data = await res.json()
  
  if (data?.exception) throw new Error(data.message)
  return data
}

export async function getCourses() {
  return moodleCall('core_course_get_courses')
}

export async function getCourseQuizzes(courseId: number) {
  return moodleCall('mod_quiz_get_quizzes_by_courses', { 'courseids[0]': String(courseId) })
}
