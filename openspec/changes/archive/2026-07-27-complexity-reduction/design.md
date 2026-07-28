# Design: Complexity Reduction

## Technical Approach

Four sequential steps, each independently verifiable with originals preserved:

1. **Types** → migrate inline admin interfaces to `src/types/index.ts`
2. **Components** → extract `AdminCrudTable` (search + list + empty state) + `AdminFormModal` (modal + form + FileUpload) from the 4 admin CRUD pages
3. **API factory** → `createCrudApi()` consolidates 3 nearly-identical CRUD API modules
4. **Cleanup** → deduplicate `nivelColors`, extract `useActivePath`, remove `adminApi.ts` barrel, uninstall `dompurify`

Each step is its own commit/PR slice with before/after render comparison.

## Architecture Decisions

### Decision: AdminCrudTable props interface

| Option | Tradeoff | Choice |
|--------|----------|--------|
| Single `renderRow` function | Flexible but shifts rendering responsibility to caller | **✅ Render props** — `renderRow: (item: T) => ReactNode` + `columns` for table headings |
| Array of column configs | More structured, less flexible for card-based pages | Table columns as optional prop; card-mode auto-detected |
| Full config object | Per-page customization without prop explosion | `AdminCrudTableProps<T>` accepts `accentColor`, `emptyIcon`, `emptyMessage` |

### Decision: AdminFormModal props interface

| Option | Tradeoff | Choice |
|--------|----------|--------|
| Array of `FieldConfig` objects | Generic but complex type inference | **✅ Field config array** — `fields: FormField[]` where each field specifies `type: 'text'|'number'|'select'|'textarea'|'file'|'toggle'`, options, label |
| Render function for fields | Maximum flexibility | Rejected — 80% of fields are standard input types |
| Pass children | Too vague for a shared component | Rejected — defeats extraction purpose |

### Decision: createCrudApi factory signature

| Option | Tradeoff | Choice |
|--------|----------|--------|
| `createCrudApi<T>(basePath)` | Simple, handles 90% of CRUD | **✅ Primary factory** — generic over entity type |
| Module with hooks | Allows per-function overrides | `afterCreate`/`afterUpdate` hooks as optional params |
| Full class-based | Over-engineered for simple fetch wrappers | Rejected |

Signature: `createCrudApi<T>(basePath: string) => { list, create, update, del }`

Special APIs (saveRutinaConEjercicios) remain as standalone modules.

### Decision: useActivePath hook

| Option | Tradeoff | Choice |
|--------|----------|--------|
| Custom hook `useActivePath()` | Eliminates inline `isActive` duplication in NavLinks + MobileDrawer | **✅ Create** — hook uses `useLocation()` internally |
| Shared util function | Simpler but doesn't follow hooks convention | Rejected — both consumers are components |

### Decision: adminApi.ts barrel

| Option | Tradeoff | Choice |
|--------|----------|--------|
| Delete barrel, import modules directly | Cleaner dependency graph; each page imports only what it needs | **✅ Eliminate barrel** — pages import directly from API modules |
| Keep barrel | Convenience for the 4 admin page consumers | Rejected — barrel adds 60 lines of re-export overhead |

## Data Flow

```
Admin pages (before)          Admin pages (after)
┌──────────────────┐          ┌──────────────────┐
│ AdminEjercicios  │          │ AdminEjercicios  │
│ AdminRutinas     │  ───→   │ AdminRutinas     │  ← use AdminCrudTable
│ AdminYogaPosic   │          │ AdminYogaPosic   │    + AdminFormModal
│ AdminYogaRutinas │          │ AdminYogaRutinas │
└──────┬───────────┘          └──────┬───────────┘
       │                             │
       ▼                             ▼
┌──────────────┐            ┌──────────────────────┐
│  adminApi    │   ───→     │ createCrudApi()       │
│  (barrel)    │            │ (ejerciciosApi, etc.) │
│  ejercicios  │            └──────────────────────┘
│  rutinas     │
│  yogaAdmin   │
│  adminStats  │
└──────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add admin form types: `AdminFormData`, `AdminCrudConfig`, `CreateCrudApiResponse` |
| `src/app/components/AdminCrudTable.tsx` | Create | Generic search + list + empty state component |
| `src/app/components/AdminFormModal.tsx` | Create | Generic modal with field config array |
| `src/app/lib/createCrudApi.ts` | Create | Factory: generic CRUD API over adminFetch |
| `src/app/hooks/useActivePath.ts` | Create | Extracted `isActive` logic from NavLinks/MobileDrawer |
| `src/app/lib/ejerciciosApi.ts` | Modify | Rewrite as `createCrudApi('/api/admin/ejercicios')` call; keep types |
| `src/app/lib/rutinasApi.ts` | Modify | Rewrite CRUD as factory call; keep `saveRutinaConEjercicios` |
| `src/app/lib/yogaAdminApi.ts` | Modify | Rewrite CRUD as factory calls; keep junction functions |
| `src/app/lib/adminApi.ts` | Delete | No longer needed — import directly from modules |
| `src/app/pages/AdminEjerciciosPage.tsx` | Modify | Use AdminCrudTable + AdminFormModal (~446→~120 lines) |
| `src/app/pages/AdminRutinasPage.tsx` | Modify | Use shared components; keep ejercicio-selector modal (~600→~250 lines) |
| `src/app/pages/AdminYogaPosicionesPage.tsx` | Modify | Use shared components (~360→~90 lines) |
| `src/app/pages/AdminYogaRutinasPage.tsx` | Modify | Use shared components (~345→~80 lines) |
| `src/app/components/NavLinks.tsx` | Modify | Use `useActivePath()` hook |
| `src/app/components/MobileDrawer.tsx` | Modify | Use `useActivePath()` hook |
| `src/constants/fitness.ts` | Modify | (No change needed — already has `nivelColors`) |
| `package.json` | Modify | Remove `dompurify` dependency |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AdminCrudTable`, `AdminFormModal` | Vitest + jsdom — render with mock data, test search filter, modal open/close |
| Unit | `createCrudApi` | Mock `adminFetch`, verify correct method/url/body for each verb |
| Unit | `useActivePath` | Test with different location.pathname values |
| Integration | 4 admin pages | Render each with mock data, verify identical output before/after |
| Build | `dompurify` removal | Verify `npm run build` succeeds with no import errors |

## Threat Matrix

N/A — pure refactoring. No routing changes, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary changes. All `useActivePath` extraction preserves identical path-matching behavior.

## Migration

No migration required. Each step preserves original components alongside new ones until verified. Rollback per step: `git revert <commit>`.
