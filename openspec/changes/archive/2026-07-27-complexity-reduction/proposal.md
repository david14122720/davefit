# Proposal: Complexity Reduction

## Intent

DaveFit is ~40% built. Four admin CRUD pages share ~80% identical structure (search, modal, table, FileUpload), three admin API modules follow identical patterns, and small duplications exist across nav and constants. Eliminate structural duplication, standardize patterns, remove dead code — with **zero behavior changes**.

## Scope

### In Scope
- Extract `AdminCrudTable` + `AdminFormModal` from 4 admin CRUD pages
- Consolidate 3 admin CRUD APIs into a generic CRUD factory
- Centralize inline admin form types into `src/types/index.ts`
- Remove unused `dompurify` dependency
- Deduplicate `nivelColors` — use constants file
- Extract shared `useActivePath` hook from MobileDrawer/NavLinks
- Consolidate/remove `adminApi.ts` barrel

### Out of Scope
- User-facing behavior or UI changes
- Admin page redesign or styling changes
- Non-admin pages (unique enough)
- New features or capabilities
- State management library introduction

## Capabilities

None — pure refactoring, no spec-level changes.

## Approach

Extract before delete; each step preserves originals until verified.

1. **Types first** — move inline admin form interfaces to `src/types/index.ts`
2. **Shared components** — extract `AdminCrudTable` (search+table+empty) and `AdminFormModal` (modal+form+FileUpload) with field config props
3. **API factory** — create `createCrudApi()`; rewrite 3 modules as thin calls
4. **Cleanup** — deduplicate `nivelColors`, extract `useActivePath`, remove `adminApi.ts`, uninstall `dompurify`

Each step is a reviewable PR slice with independent verification.

## Affected Areas

| Area | Impact | Lines Δ |
|------|--------|---------|
| 4 admin CRUD pages | Modified | ~2370→~450 |
| 3 API modules + barrel | Modified/Removed | ~280→~60 |
| `src/types/index.ts` | Modified | +~30 |
| `src/constants/fitness.ts` | Modified | minor |
| `useActivePath` hook + 2 consumers | New/Modified | +~25 |
| `AdminCrudTable`, `AdminFormModal`, `createCrudApi` | New | +~200 |
| `package.json` | Modified | -1 dep |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Extracted components miss edge cases | Medium | Keep originals during transition; compare rendered output |
| Admin APIs have subtle auth/error differences | Medium | Factory accepts custom hooks per module |
| `dompurify` removal breaks build | Low | Grep-verify no imports first |

## Rollback Plan

Each PR preserves old code alongside new. Rollback: `git revert <pr-merge>`. No data risk — code-structural only.

## Dependencies

None. Self-contained refactoring.

## Success Criteria

- [ ] All 4 admin pages render identically (before/after compare)
- [ ] All tests pass unmodified
- [ ] `npm run build` succeeds
- [ ] `dompurify` removed with no build failure
- [ ] ~2500 lines removed
- [ ] No admin CRUD regressions (C/R/U/D operations)
