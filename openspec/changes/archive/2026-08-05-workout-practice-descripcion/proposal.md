# Proposal: Show Exercise Description During Workout Practice

## Intent

The `ejercicios.descripcion` column is populated for all 1,324 imported exercises, but never rendered during routine practice (`/rutinas/practicar/:rutinaId`). Users practice exercises without the short overview blurb the dataset provides. Data already flows end-to-end into `WorkoutPracticePage.tsx` (`select('*')` + interface field `descripcion?: string`) — only the render is missing. Pure additive UI change; no data, query, or backend work.

## Problem Statement

During practice, the media overlay shows only `nombre` + `grupo_muscular`, and the Info modal shows numbered `instrucciones` steps only. The description (what the exercise is / its purpose) is invisible: 100% of imported exercises carry one, 0% are shown. Users must leave the flow to find context.

## Goals / Non-Goals

**Goals**:
- Render `descripcion` inline in the media bottom-gradient overlay, clamped
- Render full `descripcion` at the top of the existing Info modal ("Guía de Operación"), before steps
- Null-safe: no empty block for admin-created exercises without description
- New `WorkoutPracticePage.test.tsx` covering present/absent description

**Non-Goals**:
- No `RoutinesPage` change (preview `select` stays lean)
- No backend/query/state changes (`select('*')` already returns the field)
- No media/visual changes
- No changes to `instrucciones` rendering or its "Sin instrucciones adicionales" fallback

## Capabilities

- **New**: `workout-practice` — practice player render contract: exercise description visible inline (clamped) during practice and in full in the guide modal; absent-description behavior
- **Modified**: None (no existing spec governs the practice player; `ejercicios-import` untouched)

## Approach

Two additive conditional renders in `WorkoutPracticePage.tsx`:

1. **Overlay** (lines 217-225): after the `grupo_muscular` badge, a `<p>` styled `text-sm text-gray-300/90 leading-relaxed line-clamp-2 drop-shadow-lg`, guarded by explicit ternary (`descripcion ? <p/> : null` — Vercel rule 6.9; never `&&` on strings). Overlay is absolute → zero layout shift; `pointer-events-none` → fine for read-only text.
2. **Info modal** (line ~296, before `instrucciones`): same null-safe guard rendering the full description.

Styling matches the page's tactical language (uppercase tracking labels, orange primary, glassmorphism). No state, queries, or new components.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/WorkoutPracticePage.tsx` | Modified | +description in overlay (217-225) & modal (295-305); ~10-15 lines |
| `src/app/pages/WorkoutPracticePage.test.tsx` | New | First test for this page; mocks `../../lib/db`, `../../lib/insforge`, `../hooks/useCelebration`, `../../lib/gamification`; ~60-80 lines |

## Risks / Open Questions

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mobile clipping from overlay text | Low | `line-clamp-2` + absolute overlay; existing `pt-20` padding |
| Test mocking complexity (4 modules) | Med | Follow `AdminEjerciciosPage.test.tsx` pattern; baseline green (14 files/89 tests) |
| Null `descripcion` (admin-created exercises) | Med | Explicit ternary guard in both renders |

**Open question**: overlay label — tactical caption ("Briefing de Operación") vs bare text. Copy decision, resolved at apply (either is low-risk).

## Rollback Plan

Single-file revert: `git checkout main -- src/app/pages/WorkoutPracticePage.tsx` (+ delete new test). No data, schema, or deploy coupling — instant revert.

## Dependencies

- None. `line-clamp-2` is core Tailwind 3.3+ (project on 3.4).

## Success Criteria

- [ ] Description visible (clamped) on the practice overlay when present
- [ ] Full description shown at top of Info modal, before steps
- [ ] No empty block/whitespace when `descripcion` is null/empty
- [ ] New `WorkoutPracticePage.test.tsx` passes; `npx vitest run` stays green
- [ ] `npm run build` passes
