# Tasks: Complexity Reduction

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3500 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Types) → PR 2 (Components) → PR 3 (API Factory) → PR 4 (Cleanup) |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Centralize types | PR 1 | `npx vitest run src/types/` | `npm run build` | `git revert` — types only, no behavior change |
| 2 | Shared components | PR 2 | `npx vitest run src/app/components/` | `npm run build && npm run preview` — visual verify 4 admin pages | `git revert` — originals preserved alongside |
| 3 | API factory | PR 3 | `npx vitest run src/app/lib/` | `npm run build` + manual CRUD test on 1 admin page | `git revert` — adminApi.ts barrel deleted but modules keep old exports until re-imports are updated |
| 4 | Cleanup + wiring | PR 4 | `npx vitest run` full suite | `npm run build` + visual verify nav isActive + admin pages | `git revert` — dompurify reinstall if needed |

## Phase 1: Foundation — Centralize Types

- [x] 1.1 Add `AdminFormData` interface and field type union (`FormFieldType = 'text'|'number'|'select'|'textarea'|'file'|'toggle'`) to `src/types/index.ts`
- [x] 1.2 Add `FormField` config interface (label, name, type, options?, required?, placeholder?) and `AdminCrudTableProps<T>` generic interface to `src/types/index.ts`

## Phase 2: Core — Shared Components

- [x] 2.1 Create `src/app/components/AdminCrudTable.tsx` with generic search input, column headings renderer, item list/cards, empty state, loading spinner, and pagination — accepting `columns`, `renderRow`, `accentColor`, `emptyIcon`, `emptyMessage`
- [x] 2.2 Create `src/app/components/AdminFormModal.tsx` with modal shell, dynamic form builder from `FormField[]`, FileUpload integration, submit/cancel buttons, and `onSubmit`/`onClose` callbacks

## Phase 3: Core — API Factory

- [x] 3.1 Create `src/app/lib/createCrudApi.ts` with generic factory: `createCrudApi<T>(basePath) => { list, create, update, del }` using `adminFetch`
- [x] 3.2 Rewrite `src/app/lib/ejerciciosApi.ts` as `createCrudApi('/api/admin/ejercicios')` call; keep existing types
- [x] 3.3 Rewrite `src/app/lib/rutinasApi.ts` CRUD as factory call; keep `saveRutinaConEjercicios` standalone
- [x] 3.4 Rewrite `src/app/lib/yogaAdminApi.ts` CRUD as factory calls; keep junction functions
- [x] 3.5 Delete `src/app/lib/adminApi.ts` barrel; update 4 admin page imports to import directly from individual API modules

## Phase 4: Cleanup

- [x] 4.1 Create `src/app/hooks/useActivePath.ts` — hook returning `isActive(path) => boolean` using `useLocation()`
- [x] 4.2 Update `src/app/components/NavLinks.tsx` to use `useActivePath()` instead of inline `isActive`
- [x] 4.3 Update `src/app/components/MobileDrawer.tsx` to use `useActivePath()` instead of inline `isActive`
- [x] 4.4 Replace inline `nivelColors` in `AdminYogaPosicionesPage.tsx` and `AdminYogaRutinasPage.tsx` with import from `src/constants/fitness`
- [x] 4.5 Remove `"dompurify"` from `package.json` dependencies; run `npm install`
- [x] 4.6 Run `npm run build` and full test suite — verify zero regressions
