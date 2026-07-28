import React from 'react';

// ============================================================
// Skeletons reutilizables
// ============================================================

/** Page loader (centered spinner) */
export function PageLoader() {
  return (
    <div className="flex bg-background-dark min-h-screen items-center justify-center text-white flex-col gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium animate-pulse">Cargando...</span>
    </div>
  );
}

/** Barra de pulso para texto */
export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`bg-white/10 rounded-sm animate-pulse ${className}`} />;
}

/** Card skeleton completo */
export function SkeletonCard({ className = '' }: { className?: string }) {
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

/** List skeleton (varias filas) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-surface border border-white/5">
          <div className="w-12 h-12 rounded-lg bg-white/10 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-4 w-3/4" />
            <SkeletonBar className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grid skeleton (cards en grid) */
export function GridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: cards }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
