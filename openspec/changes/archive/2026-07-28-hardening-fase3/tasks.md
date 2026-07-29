# Tasks: Hardening Fase 3

## Task Breakdown

### 1. ESLint flat config setup [completed]
- **Files**: `eslint.config.js` (new)
- **Done when**: `npm run lint` exits 0

### 2. Vite manualChunks implementation [completed]
- **Files**: `astro.config.mjs`
- **Done when**: `npm run build` produces split vendor chunks

### 3. InsforgeClient typed wrapper module [completed]
- **Files**: `src/lib/insforge-types.ts` (new), `src/lib/insforge.ts` (updated exports)
- **Done when**: `grep -rn "insforge as any" src/` returns 0 matches

### 4. AuthContext refactor (useCallback + deps) [completed]
- **Files**: `src/app/context/AuthContext.tsx`

### 5. Replace (insforge as any) usages [completed]
- **Files**: `src/lib/insforge-types.ts`, `src/lib/insforge.ts`, various page files

### 6. Route guards for /yoga/practicar and /rutinas/practicar [completed]
- **Files**: `src/app/App.tsx`

### 7. App.test.tsx — new tests for guarded routes [completed]
- **Files**: `src/app/App.test.tsx`

### 8. Bulk cleanup of unused imports/vars [completed]
- **Files**: 11 files with fixes
- **Done when**: Unused-import/variable warnings eliminated; `no-console` and `exhaustive-deps` fixes applied

### 9. Final lint+tests+build verification [completed]
- **Steps**: npm run lint → npm run build → npx vitest run
- **Result**: All three gates pass

### 10. Generate hardening_fase3.md document [completed]
- **Files**: `./hardening_fase3.md` (new)
- **Done when**: File exists with all required sections

### 11. Archive the SDD change [pending]
- **Steps**: Run `sdd-archive` skill
