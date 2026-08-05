# Exploration: workout-practice-descripcion

> Change: `workout-practice-descripcion` | Phase: explore | Date: 2026-08-04

## Current State

`src/app/pages/WorkoutPracticePage.tsx` (349 lines) is the routine practice player (`/rutinas/practicar/:rutinaId`). The `ejercicios` table `descripcion` column is populated (1,324 imported exercises) but NEVER rendered during practice.

**Data flow verified end-to-end (no loss points):**

1. `getById('rutinas', rutinaId)` (line 88) → routine header.
2. `rutinas_ejercicios` `.select('*')` ordered by `orden` (line 92) → join rows with `series`, `repeticiones`, `descanso_segundos`.
3. `ejercicios` `.select('*')` `.in('id', ids)` (line 97) → **ALL columns including `descripcion`**.
4. `ejerciciosMap` (line 99) → each join row gets `ejercicio` attached (line 100).

The interface already declares the field: `descripcion?: string` and `instrucciones?: string[]` on `Ejercicio.ejercicio` (lines 28-29). **The description is present in state — only the render is missing.**

**Render today** (lines 189-252): media (video/img fallback) with bottom gradient overlay showing `nombre` (line 218) + `grupo_muscular` badge + `Info` button (lines 219-224); stats grid "Series"/"Reps" (lines 235-246); rest indicator (lines 249-252). The `showInstructions` slide-up modal (lines 283-310) renders `instrucciones[]` numbered steps only, with a "Sin instrucciones adicionales" fallback (line 304). `handleSiguiente`/`handleAnterior` reset `showInstructions` (lines 129, 132) — modal-only content is lost per navigation, inline content would not be.

**Theme**: dark `#0a0a0a` bg; primary orange `#ff6b00` (`--color-primary` in `src/styles/global.css`, confirmed — the green swap from `stitch-ui-overhaul` proposal is NOT applied to the practice page, which still uses `rgba(255,107,0,...)` glows). Tactical UI language: uppercase tracking labels (`text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]`), glassmorphism (`bg-[#141414]/80 backdrop-blur-3xl border border-white/5 rounded-xl`).

`src/app/pages/RoutinesPage.tsx` line 94 selects `'id, nombre, grupo_muscular, imagen_url'` for the preview modal only — **NOT affected**; practice refetches with `select('*')`.

## Affected Areas

| File | Why |
|---|---|
| `src/app/pages/WorkoutPracticePage.tsx` | Only file that needs a render change (overlay at ~line 217-225 and/or Info modal ~283-310). No query/state changes. |
| `src/app/pages/WorkoutPracticePage.test.tsx` (NEW) | No test exists for this page today. Follows `AdminEjerciciosPage.test.tsx`/`AdminRutinasPage.test.tsx` pattern. |

**NOT affected**: `RoutinesPage.tsx` (preview select stays lean), `ejerciciosApi.ts`, `lib/db.ts`, backend, DB schema.

## Approaches

1. **Inline description in the media overlay (recommended, minimal)** — add a conditional `<p>` under the `grupo_muscular` badge inside the existing bottom gradient overlay (lines 217-225), styled `text-sm text-gray-300/90 leading-relaxed line-clamp-2/3 drop-shadow-lg` with the tactical label ("Briefing de Operación") or bare text.
   - Pros: visible immediately during practice (satisfies the request as stated); absolute-positioned → zero layout shift for stats/footer; ~6-10 lines; no state or query changes; `line-clamp` handles long text.
   - Cons: long text can cover more of the image (mitigated by clamp); overlay has `pointer-events-none` so no interaction needed — fine for read-only text.
   - Effort: Low.

2. **Extend the existing Info modal** — render `descripcion` at the top of the "Guía de Operación" panel (line 295), before `instrucciones`.
   - Pros: full text without clamps; reuses existing modal pattern; zero layout impact.
   - Cons: hidden behind a tap — does NOT satisfy "visible during practice" by default; modal resets on navigation (already handled).
   - Effort: Low (~5 lines).

3. **Full-width glass card between stats and rest indicator** — a new "Briefing" block (`bg-[#141414]/80 backdrop-blur-3xl rounded-xl border border-white/5`).
   - Pros: matches the stats-block visual language exactly; uncluttered media.
   - Cons: page is `overflow-hidden touch-none` with `justify-between` (line 154, 190) — adding in-flow content risks clipping the footer on small screens; more invasive. Needs `line-clamp-3` anyway.
   - Effort: Medium (~15 lines).

**Recommendation: Approach 1 (inline overlay, clamped) + optional Approach 2 (full text in Info modal)**. The overlay renders the description the moment an exercise appears — no interaction, no layout risk — and the modal extension (already the home of `instrucciones`) gives the full text for long descriptions. Both are pure additive conditionals; total ~10-15 lines.

## Edge Cases

- **Empty/null `descripcion`**: 1,324 dataset rows are populated, but admin-created exercises (AdminEjerciciosPage form, `descripcion` optional textarea) may be empty. MUST render conditionally (explicit ternary per Vercel rule 6.9 — never `&&` on a string).
- **Long descriptions**: dataset descriptions are short blurbs, but no guarantee — `line-clamp-2` (overlay) + full text in the Info modal.
- **`instrucciones` vs `descripcion`**: distinct fields (overview vs step-by-step). Both should coexist: description inline + steps in modal; modal shows description first when present, then the existing numbered steps + existing empty fallback (line 304).
- **Data loss**: none — `select('*')` already returns `descripcion`; no query change needed anywhere in the chain.

## Tests

- **No `WorkoutPracticePage.test.tsx` exists** (glob confirmed: only Register/Nutrition/AdminEjercicios/Biblioteca/Dashboard/AdminRutinas/Login page tests).
- Existing pattern (`AdminEjerciciosPage.test.tsx`, `AdminRutinasPage.test.tsx`): `mockAuth` object + `vi.mock('../context/AuthContext')`, `vi.mock` of API libs, `MemoryRouter`, `screen`/`fireEvent`/`waitFor`, Spanish `describe`/`it` titles.
- WorkoutPracticePage needs heavier mocks than admin tests: `../../lib/db` (`getById`, `queryWithRetry`), `../../lib/insforge`, `../hooks/useCelebration` (`useCelebration`), and `../../lib/gamification` (`processWorkoutCompletion`, `calcularCalorias`). New tests: (a) description renders when present; (b) no description block when null/empty. Est. ~60-80 lines.
- **Baseline verified green**: `npx vitest run` → 14 files / 89 tests passed (2026-08-04). The Vitest config issue flagged in `ejercicios-schema-dataset` exploration does not block the current run.

## OpenSpec Conventions (repo)

- Change dir: `openspec/changes/{name}/` with `exploration.md` → `proposal.md` → `spec.md` → `design.md` → `tasks.md`, plus lifecycle `verify-report.md` / `apply-progress.md` / `archive-report.md` (see `ejercicios-schema-dataset/`, `stitch-ui-overhaul/`, `archive/2026-08-03-ejercicios-import-carga/`).
- Capability specs live in `openspec/specs/{capability}/spec.md` (`ejercicios-import`, `nutrition`); no `config.yaml` in repo.
- Artifact language: proposal/spec/design/tasks are English; this exploration is written in English to match.

## Risks

1. **Mobile clipping**: page root is `overflow-hidden touch-none` — any in-flow content added to `main` could squeeze/clip the footer on small screens. Mitigated by Approach 1 (overlay is absolute, clamped).
2. **No existing test coverage** for this page; new test must mock 4 modules (`db`, `insforge`, `gamification`, `useCelebration`) — heavier than admin-page tests. Baseline is green, so test infra is safe.
3. **Null descriptions** from manually-created exercises → must guard; otherwise empty block/whitespace.
4. **Scope creep**: do NOT touch `RoutinesPage` preview select (lean by design) or the `showInstructions` fallback text.

## Line Estimate (review budget 400)

- Overlay render: ~8-10 | Info modal extension (optional): ~5 | New test file: ~60-80
- **Total: ~75-95 lines → risk: LOW** (single comfortable PR; no chained PRs).

## Recommendation

Approach 1 (inline clamped description in the media overlay) with Approach 2 (full text in the existing Info modal) as optional polish. Pure additive, no data/query/state changes, follows the page's existing tactical styling. New `WorkoutPracticePage.test.tsx` covering present/absent description.

## Ready for Proposal

**Yes** — single-file render change, data already flowing, edge cases identified, test pattern established, budget low.
