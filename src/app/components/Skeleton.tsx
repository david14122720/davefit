import React from 'react';

// ============================================================
// Page loader (centered spinner) — único skeleton usado
// ============================================================
export function PageLoader() {
  return (
    <div className="flex bg-[#0a0a0a] min-h-screen items-center justify-center text-white flex-col gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium animate-pulse">Cargando...</span>
    </div>
  );
}
