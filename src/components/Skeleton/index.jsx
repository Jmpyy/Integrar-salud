/**
 * Skeleton loaders para estados de carga
 */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
              <div className="w-16 h-6 bg-slate-200 rounded-full" />
            </div>
            <div className="w-24 h-4 bg-slate-200 rounded mb-2" />
            <div className="w-32 h-8 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-slate-100">
          <div className="w-40 h-6 bg-slate-200 rounded mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
              <div className="w-16 h-6 bg-slate-200 rounded" />
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-5 bg-slate-200 rounded" />
                <div className="w-32 h-4 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100">
          <div className="w-36 h-6 bg-slate-200 rounded mb-4" />
          <div className="w-full h-32 bg-slate-200 rounded-2xl mb-4" />
          <div className="w-full h-24 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="w-48 h-6 bg-slate-200 rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0">
          <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-40 h-5 bg-slate-200 rounded" />
            <div className="w-24 h-4 bg-slate-200 rounded" />
          </div>
          <div className="w-20 h-8 bg-slate-200 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
        <div className="space-y-2">
          <div className="w-32 h-5 bg-slate-200 rounded" />
          <div className="w-24 h-4 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="w-full h-20 bg-slate-200 rounded-xl" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100">
        <div>
          <div className="w-48 h-7 bg-slate-200 rounded mb-2" />
          <div className="w-64 h-4 bg-slate-200 rounded" />
        </div>
        <div className="w-64 h-12 bg-slate-200 rounded-2xl" />
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
