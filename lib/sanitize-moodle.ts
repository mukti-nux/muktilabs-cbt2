// @/lib/sanitize-moodle.ts
import DOMPurify from 'dompurify'

// Konfigurasi ketat: hanya izinkan tag & atribut yang benar-benar dibutuhkan Moodle
const MOODLE_ALLOWED_TAGS = [
  // Struktur
  'p', 'br', 'div', 'span', 'section', 'article',
  // Formatting
  'strong', 'b', 'em', 'i', 'u', 'mark', 'small', 'sub', 'sup',
  // List
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Table
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
  // Image & Media
  'img', 'figure', 'figcaption', 'audio', 'video', 'source', 'track',
  // Link
  'a',
  // Code & Pre
  'code', 'pre', 'kbd', 'samp',
  // Math (jika Moodle pakai MathJax)
  'math', 'mrow', 'mi', 'mn', 'mo', 'mspace', 'mfrac', 'msqrt'
]

const MOODLE_ALLOWED_ATTR = [
  // Global
  'id', 'class', 'style', 'title', 'lang', 'dir',
  // Image
  'src', 'alt', 'width', 'height', 'loading', 'decoding',
  // Link
  'href', 'target', 'rel',
  // Media
  'controls', 'autoplay', 'loop', 'muted', 'poster', 'preload',
  // Table
  'colspan', 'rowspan', 'scope',
  // Accessibility
  'role', 'aria-label', 'aria-hidden'
]

// Blokir protokol berbahaya untuk src/href
const ALLOWED_PROTOCOLS = ['http', 'https', 'mailto', 'tel']

export function sanitizeMoodleContent(html: string): string {
  if (typeof window === 'undefined') return html // SSR safe
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MOODLE_ALLOWED_TAGS,
    ALLOWED_ATTR: MOODLE_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: new RegExp(`^(?:${ALLOWED_PROTOCOLS.map(p => `${p}:`).join('|')}|/|#)`, 'i'),
    ADD_ATTR: ['target'], // Izinkan target="_blank" untuk link eksternal
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'], // Blokir event handlers & inline style
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea'], // Blokir tag interaktif berbahaya
    USE_PROFILES: { html: true }, // Hanya profil HTML, blokir SVG/MathML jika tidak dibutuhkan
  })
}

// Helper untuk gambar: tambah lazy loading + kelas styling
export function enhanceMoodleImages(html: string): string {
  if (typeof window === 'undefined') return html
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  doc.querySelectorAll('img').forEach(img => {
    // Tambah lazy loading
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
    
    // Tambah kelas untuk styling konsisten
    const existingClass = img.getAttribute('class') || ''
    img.setAttribute('class', `${existingClass} moodle-image`.trim())
    
    // Keamanan: pastikan src tidak kosong atau javascript:
    const src = img.getAttribute('src') || ''
    if (src.startsWith('javascript:') || src.startsWith('data:')) {
      img.remove()
    }
  })
  
  return doc.body.innerHTML
}

// Fungsi gabungan: sanitize + enhance
export function processMoodleContent(html: string): string {
  const sanitized = sanitizeMoodleContent(html)
  return enhanceMoodleImages(sanitized)
}