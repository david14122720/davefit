# Tasks: Workout Practice Description Rendering

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100–110 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single small change |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | R1+R2 renders + R3 test shipped together | PR 1 (single) | `npx vitest run` — 14 files/89 tests baseline + new file green | `npm run build` + manual `/rutinas/practicar/:id` smoke (clamp visual) | `git checkout main -- src/app/pages/WorkoutPracticePage.tsx` + delete test |

## Phase 1: Core Implementation (R1, R2)

- [x] 1.1 `src/app/pages/WorkoutPracticePage.tsx`: insert R1 ternary after badge-row `</div>` (line 224), before gradient close (line 225) — `<p>` with `line-clamp-2` (overlay; `descripcion ? ... : null`)
- [x] 1.2 Same file: insert R2 ternary after `<h4>` nombre (line 296), before `space-y-6` steps container (line 297) — labeled `Descripción` block, full unclamped text; acceptance: grep shows no `&&` on `descripcion` (Vercel 6.9)

## Phase 2: Testing (R3)

- [x] 2.1 Create `src/app/pages/WorkoutPracticePage.test.tsx`: present fixture — stub `insforge.database.from` chain on real `../../lib/insforge` (`rutinas`→`maybeSingle`, `rutinas_ejercicios`→`order`, `ejercicios`→`in`) per BibliotecaPage.test.tsx; mock `../context/AuthContext` (`mockAuth`), `../hooks/useCelebration` (no-op `vi.fn()`s — real hook throws `AudioContext` in jsdom), `../../lib/gamification` (`vi.fn()`s); render with `MemoryRouter initialEntries={['/rutinas/practicar/r1']}` + `<Route path="/rutinas/practicar/:rutinaId">`
- [x] 2.2 Test: desc present — assert `getByText(desc)` in overlay with `toHaveClass('line-clamp-2')`; open modal via `container.querySelector('svg.lucide-info').closest('button')`; assert `getByText('Guía de Operación')`, `getAllByText(desc)` length 2 (overlay+modal), steps render below
- [x] 2.3 Test: desc absent — fixture without `descripcion`; assert no `.line-clamp-2` element and no modal desc block, steps/"Sin instrucciones adicionales" unchanged; `db.ts` NOT mocked (real `queryWithRetry`/`getById` run against stub)

## Phase 3: Verification

- [x] 3.1 Run `npx vitest run` — acceptance: new file green + baseline 14 files/89 tests stay green (no regressions)
- [x] 3.2 `npm run build` — compile gate; record result for sdd-verify (clamp is CSS, jsdom proxies via class presence)
- [x] 3.3 Evidence summary: diff count (<110 lines), both ternary renders, test scenarios R1/R2 present+absent — hand off to sdd-verify