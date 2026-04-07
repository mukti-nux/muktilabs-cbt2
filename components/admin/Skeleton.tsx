// Skeleton components for loading states

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(j => (
                <div key={j}>
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="grid gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 w-20 bg-slate-300 dark:bg-slate-600 rounded" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="grid gap-4 p-4 border-b border-slate-100 dark:border-slate-700">
            {Array.from({ length: cols }).map((_, ci) => (
              <div key={ci} className="h-4 bg-slate-200 dark:bg-slate-700 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="animate-pulse space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-24 w-full bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 mb-3" />
        <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  )
}