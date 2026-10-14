// ============================================================
// Skeleton de carga del Dashboard (layout rediseño Stitch)
//
// Vive en su propio archivo para que sólo se cargue dentro del
// chunk lazy de DashboardPage (antes se importaba desde Skeleton.tsx,
// que App importa de forma eager para PageLoader).
// ============================================================

/** Barra de pulso para texto */
function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`bg-white/10 rounded-sm animate-pulse ${className}`} />;
}

/** Card skeleton compacta (grid de métricas) */
function SkeletonMetricCard() {
  return (
    <div className="rounded-xl bg-[#1c1b1c] p-4 lg:p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
        <SkeletonBar className="h-5 w-20 rounded-full" />
      </div>
      <SkeletonBar className="h-3 w-28 mb-2" />
      <SkeletonBar className="h-6 w-32 mb-3" />
      <SkeletonBar className="h-2 w-full rounded-full" />
    </div>
  );
}

/** Dashboard skeleton (banner + 4 métricas + split 8/4 + historial) */
export function DashboardSkeleton() {
  return (
    <div className="w-full flex flex-col gap-5 animate-pulse">
      {/* Banner */}
      <div className="rounded-xl bg-[#1c1b1c] p-6 md:p-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <SkeletonBar className="h-6 w-36 rounded-full" />
          <SkeletonBar className="h-6 w-32 rounded-full" />
          <SkeletonBar className="h-6 w-28 rounded-full" />
        </div>
        <SkeletonBar className="h-10 w-72 max-w-full rounded-lg mb-3" />
        <SkeletonBar className="h-4 w-96 max-w-full" />
      </div>

      {/* Métricas semanales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>

      {/* Split principal */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12">
        <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-8">
          <div className="h-72 rounded-xl bg-white/5" />
          <div className="h-56 rounded-xl bg-white/5" />
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-4">
          <div className="h-48 rounded-xl bg-white/5" />
          <div className="h-56 rounded-xl bg-white/5" />
        </div>
      </div>

      {/* Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-40 rounded-xl bg-white/5" />
        <div className="h-40 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
