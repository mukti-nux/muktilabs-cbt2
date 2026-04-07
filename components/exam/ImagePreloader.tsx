'use client'
import { useEffect, useState, useRef } from 'react'

interface PreloadConfig {
  urls: string[]
  onProgress?: (loaded: number, total: number) => void
  timeout?: number
}

interface CachedImage {
  url: string
  blob: Blob | null
  error: boolean
}

// Simple in-memory cache
const imageCache = new Map<string, CachedImage>()

// Preload images with caching
export async function preloadImages(config: PreloadConfig): Promise<Map<string, CachedImage>> {
  const cache = new Map<string, CachedImage>()
  let loaded = 0
  const total = config.urls.length

  const loadImage = async (url: string) => {
    try {
      // Check cache first
      if (imageCache.has(url)) {
        loaded++
        config.onProgress?.(loaded, total)
        return imageCache.get(url)!
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeout || 10000)

      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const blob = await response.blob()
      const cached: CachedImage = { url, blob, error: false }
      
      imageCache.set(url, cached)
      cache.set(url, cached)
      loaded++
      config.onProgress?.(loaded, total)

      return cached
    } catch (e) {
      const cached: CachedImage = { url, blob: null, error: true }
      imageCache.set(url, cached)
      cache.set(url, cached)
      loaded++
      config.onProgress?.(loaded, total)
      return cached
    }
  }

  // Load in batches of 3 for performance
  const batchSize = 3
  for (let i = 0; i < config.urls.length; i += batchSize) {
    const batch = config.urls.slice(i, i + batchSize)
    await Promise.all(batch.map(url => loadImage(url)))
  }

  return cache
}

// Clear cache for specific URLs
export function clearImageCache(urls?: string[]) {
  if (urls) {
    urls.forEach(url => imageCache.delete(url))
  } else {
    imageCache.clear()
  }
}

// Get cached image blob
export function getCachedImage(url: string): CachedImage | undefined {
  return imageCache.get(url)
}

// React hook for preloading
export function useImagePreloader(urls: string[], enabled: boolean = true) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(0)

  useEffect(() => {
    if (!enabled || urls.length === 0) return

    setLoading(true)
    setError(null)
    loadedRef.current = 0

    preloadImages({
      urls,
      onProgress: (loaded, total) => {
        loadedRef.current = loaded
        setProgress({ loaded, total })
        if (loaded === total) {
          setLoading(false)
        }
      },
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [urls.join(','), enabled])

  return { loading, progress, error }
}

// Preload wrapper component
export function ImagePreloader({ 
  urls, 
  enabled = true, 
  children,
  loadingEl,
}: { 
  urls: string[]
  enabled?: boolean
  children: React.ReactNode
  loadingEl?: React.ReactNode
}) {
  const { loading, progress } = useImagePreloader(urls, enabled)

  if (loading) {
    return loadingEl ? (
      <>{loadingEl}</>
    ) : (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">
          Memuat gambar ({progress.loaded}/{progress.total})...
        </span>
      </div>
    )
  }

  return <>{children}</>
}

// Lazy image component that uses cache
export function LazyImage({
  src,
  alt,
  className,
  placeholder,
}: {
  src: string
  alt: string
  className?: string
  placeholder?: React.ReactNode
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const cached = getCachedImage(src)
    if (cached?.blob) {
      setLoaded(true)
    } else if (!cached?.error) {
      preloadImages({
        urls: [src],
        onProgress: (_, total) => {
          if (total > 0) setLoaded(true)
        },
      }).catch(() => setError(true))
    }
  }, [src])

  if (error || !loaded) {
    return placeholder || (
      <div className={`${className} bg-slate-200 dark:bg-slate-700 animate-pulse rounded`} />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
    />
  )
}