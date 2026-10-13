// ============================================================
// Skeleton de carga del Dashboard
//
// Vive en su propio archivo para que sólo se cargue dentro del
// chunk lazy de DashboardPage (antes se importaba desde Skeleton.tsx,
// que App importa de forma eager para PageLoader).
// ============================================================

/** Barra de pulso para texto */
function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`bg-white/10 rounded-sm animate-pulse ${className}`} />;
}

/** Card skeleton completo */
function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 rounded-lg bg-surface border border-white/5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
        <SkeletonBar className="h-4 w-24" />
      </div>
      <SkeletonBar className="h-8 w-16 mb-2" />
      <SkeletonBar className="h-3 w-32" />
    </div>
  );
}

/** Dashboard skeleton (grid 3-column) */
export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <SkeletonBar className="w-64 h-10 rounded-lg" />
        <SkeletonBar className="w-40 h-12 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 h-72 bg-white/5 rounded-lg" />
        <div className="h-72 bg-white/5 rounded-lg" />
      </div>
    </div>
  );
}
