# Design: Show Exercise Description During Workout Practice

## Technical Approach

Two additive conditional renders in `src/app/pages/WorkoutPracticePage.tsx` (R1: clamped inline in the media bottom-gradient overlay; R2: full text at the top of the "Guía de Operación" modal), both guarded by explicit ternary per Vercel rule 6.9 (`rendering-conditional-render` — never `&&` on a string). No queries, state, `RoutinesPage`, or `instrucciones` rendering changes. New `WorkoutPracticePage.test.tsx` locks the present/absent contract (R3).

## Architecture Decisions

| Decision | Option | Tradeoff | Decision |
|---|---|---|---|
| Overlay label | "Briefing de Operación" caption vs bare text | Caption adds noise under a big title; bare text reads as the exercise's overview | **Bare text** (proposal copy question, resolved) |
| Modal presentation | Labeled block (`Descripción` micro-label) vs bare paragraph | Label matches the page's tactical micro-label language (`text-[10px] uppercase tracking-[0.2em]`); bare text would be ambiguous vs the steps below | **Labeled block, gray-400 body** (matches step text style) |
| Test mock strategy | Mock `db` + `insforge` modules (exploration guess) vs stub `insforge.database.from` chain on the REAL module | Repo page tests (Biblioteca, Dashboard, Nutrition) already stub the SDK chain; real `queryWithRetry`/`getById` run against it. Mocking `db` needs fragile `mockResolvedValueOnce` ordering | **Stub the chain** (follow repo convention; note divergence from exploration) |
| Info-button selection in test | Add `aria-label` to button vs `container.querySelector('svg.lucide-info').closest('button')` | aria-label is an a11y win but widens the diff beyond renders | **querySelector** (zero source change; aria-label optional follow-up) |

## Data Flow

    loadRutina effect
      getById('rutinas', id) ──rutina──▶ rutina state
      queryWithRetry(from('rutinas_ejercicios').select('*').order) ──join rows──▶
      queryWithRetry(from('ejercicios').select('*').in(ids)) ──▶ ejerciciosMap ──▶ currentEjercicio
        └─ ejercicio.descripcion ──▶ R1 overlay <p> (line-clamp-2) │ R2 modal block (full)

`descripcion` already flows via `select('*')` (interface line 28 declares `descripcion?: string`); render is the only gap.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/WorkoutPracticePage.tsx` | Modify | +2 guarded `<p>`/block renders (~8-10 lines total) |
| `src/app/pages/WorkoutPracticePage.test.tsx` | Create | First test for this page; 4 scenarios (~90 lines) |

## Interfaces / Contracts

Insert 1 — overlay, after the badge-row `</div>` (line 224), before the gradient container close (line 225). Parent already has `bg-linear-to-t from-black via-black/40` + `pointer-events-none`:

```tsx
{currentEjercicio.ejercicio?.descripcion ? (
  <p className="mt-3 text-xs sm:text-sm text-white/80 font-medium line-clamp-2 drop-shadow-lg">
    {currentEjercicio.ejercicio.descripcion}
  </p>
) : null}
```

Insert 2 — modal, after the `<h4>` nombre (line 296), before the `space-y-6` steps container (line 297):

```tsx
{currentEjercicio.ejercicio?.descripcion ? (
  <div className="mb-6">
    <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Descripción</h5>
    <p className="text-gray-400 text-sm leading-relaxed font-medium">{currentEjercicio.ejercicio.descripcion}</p>
  </div>
) : null}
```

Ternaries narrow `descripcion` to `string` in the true branch (optional-chaining narrowing, TS strict-safe). Both branches render **nothing** for null/`''` — no empty block (spec R1/R2 absent scenarios).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | R1 present: description in overlay | Mock `insforge.database.from` chain per table (`rutinas`→`.maybeSingle`, `rutinas_ejercicios`→`.order`, `ejercicios`→`.in`); call `getByText(desc)`, assert `toHaveClass('line-clamp-2')` |
| Unit | R2 present: full desc in modal before steps | Open modal via `querySelector('svg.lucide-info').closest('button')`; assert `getByText('Guía de Operación')`, `getAllByText(desc)` length 2 (overlay+modal), steps render below |
| Unit | R1/R2 absent: no description block | Fixture without `descripcion`; assert `container.querySelector('.line-clamp-2')` is null and steps still render |
| Visual | Clamp behavior | `npm run build` + manual smoke (jsdom cannot measure line clamping; class presence is the automated proxy) |

**Mocks** (4 modules): `../context/AuthContext` (`mockAuth` — same shape as admin/dashboard tests), `../hooks/useCelebration` (vi.fn no-ops — real hook would throw on `new AudioContext()` in jsdom), `../../lib/gamification` (`vi.fn()`s — only invoked on workout completion, never in these tests), and `insforge.database.from` chain stub on the real `../../lib/insforge` import (per BibliotecaPage.test.tsx). **`db.ts` is NOT mocked** — real `queryWithRetry`/`getById` execute against the stubbed chain. Render helper needs `MemoryRouter initialEntries={['/rutinas/practicar/r1']}` + `<Route path="/rutinas/practicar/:rutinaId">` because the page reads `useParams` (admin tests' bare `MemoryRouter` won't work). Baseline: 14 files/89 tests green (2026-08-04); suite must stay green.

## Edge Cases

- **Long descriptions**: `line-clamp-2` clamps overlay text (CSS; verified visually at apply smoke); modal shows full text unclamped in `max-h-[80vh] overflow-y-auto` panel.
- **Null/empty**: ternary guards both renders; `''` is falsy → guarded. Whitespace-only string is out of scope (dataset/admin form store trimmed values).
- **Modal open state**: `showInstructions` gates the modal only; overlay is unconditional per exercise. `handleSiguiente`/`handleAnterior` already reset `showInstructions` — unchanged.
- **Single-exercise fixture**: `progreso` math safe (`length ≥ 1`); loading/error early-returns precede render.

## Threat Matrix

N/A — no routing (React Router params are app-internal, not a deployment/routing-config boundary), shell, subprocess, VCS/PR automation, executable-file classification, or process-integration change.

## Migration / Rollout

No migration, no feature flags, no coupling. Rollback: `git checkout main -- src/app/pages/WorkoutPracticePage.tsx` + delete test. Estimated diff ~100-110 lines → **400-line budget risk: Low**, single PR, chained PRs not recommended.

## Open Questions

- [ ] Optional follow-up (not this change): `aria-label="Guía de Operación"` on the Info button for a11y/testability.