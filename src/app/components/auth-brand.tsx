// ============================================================
// Auth brand marks — exact SVG artwork from the Stitch designs
// Shared by LoginPage and RegisterPage.
// ============================================================

/** Official multicolor Google "G" mark (exact artwork from the Stitch design). */
export function GoogleMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853" />
      <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05" />
      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
    </svg>
  );
}

/** Tilted dumbbell mark used by the login brand tile (exact paths from the Stitch design). */
export function BrandDumbbell({ className = 'w-6 h-6 text-white' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1" />
      <path d="m3 3 1 1" />
      <path d="m18 22 4-4" />
      <path d="m2 6 4-4" />
      <path d="m3 10 7-7" />
      <path d="m14 21 7-7" />
    </svg>
  );
}

/** Filled dumbbell used by the register brand tile (exact path from the Stitch design). */
export function FilledDumbbell({ className = 'w-5 h-5 fill-current text-white' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 5h2v14H6zm10 0h2v14h-2zm-7 6h6v2H9zm-7 2h2v4H2zm0-6h2v4H2zm18 0h2v4h-2zm0 6h2v4h-2z" />
    </svg>
  );
}

/** Small plate-dumbbell used by the "Plan Estudiante" badge (exact paths from the Stitch design). */
export function BadgeDumbbell({ className = 'w-4 h-4 text-[#ff5e00]' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
    </svg>
  );
}

/** Lightning bolt used by the register "Plan Estudiante Activo" badge (exact path from the Stitch design). */
export function BoltIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/** Rating star (exact path from the Stitch design). */
export function Star({ className = 'w-4 h-4 fill-current' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

interface StudentAvatarsProps {
  sizeClass?: string;
  /** Initials shown in the avatar bubbles (login: LC/MA/JP/+2k). */
  labels?: [string, string, string, string];
  /** Ring color behind the avatars (matches the page background). */
  ringClass?: string;
  firstThreeClasses?: [string, string, string];
}

/** Student avatar bubbles used in the social-proof rows. */
export function StudentAvatars({
  sizeClass = 'h-9 w-9',
  labels = ['LC', 'MA', 'JP', '+2k'],
  ringClass = 'ring-[#111113]',
  firstThreeClasses = ['bg-zinc-700 text-zinc-300', 'bg-[#c2410c] text-white', 'bg-zinc-800 text-zinc-300'],
}: StudentAvatarsProps) {
  const [a, b, c, d] = labels;
  const [c1, c2, c3] = firstThreeClasses;
  return (
    <div className="flex -space-x-2.5 overflow-hidden" aria-hidden="true">
      <div className={`inline-block ${sizeClass} rounded-full ring-2 ${ringClass} ${c1} flex items-center justify-center font-bold text-xs`}>{a}</div>
      <div className={`inline-block ${sizeClass} rounded-full ring-2 ${ringClass} ${c2} flex items-center justify-center font-bold text-xs`}>{b}</div>
      <div className={`inline-block ${sizeClass} rounded-full ring-2 ${ringClass} ${c3} flex items-center justify-center font-bold text-xs`}>{c}</div>
      <div className={`inline-block ${sizeClass} rounded-full ring-2 ${ringClass} bg-[#ff5e00] flex items-center justify-center text-xs font-bold text-white`}>{d}</div>
    </div>
  );
}
