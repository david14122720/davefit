# Design: Stitch UI Overhaul

## Technical Approach

Complete UI refactor across 4 chained PRs. Replace orange `#ff6b00` primary with Stitch green `#13ec5b`, apply warm-dark surfaces (`#1d100a` bg, `#2b1c16` surface), restore profile metrics, and add NutritionPage. Each PR targets a clean slice: Foundation, Main Pages, Nutrition+Profile, Nav+Polish.

---

## Architecture Decisions

### Decision: Profile restoration — dedicated route + dashboard tab
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Full profile as modal | Context-switching, complex state | ❌ |
| Full profile as dashboard tab | Bloats Dashboard (577→1100+ lines) | ❌ |
| **Restore `/perfil` route + keep dashboard perfil tab as summary** | Clean separation, both accessible, editing works | ✅ |

**Rationale**: Dashboard's existing perfil tab (60 lines, lines 436–517 of DashboardPage.tsx) stays as a quick summary card. The 525-line ProfilePage.tsx gets its own route `/perfil` under ProtectedRoute. The Dashboard "Editar Perfil" link targets `/perfil` — no more redirect loop.

### Decision: Sidebar nav stays, labels/icons update to Stitch
**Rationale**: Current AppLayout has a working sidebar + mobile bottom nav. Stitch design uses a similar sidebar pattern. No need to restructure — just update the 3 public nav items (Biblioteca, Nutrición, Acerca de), icon SVGs, and active-state colors (orange→green).

### Decision: Color swap via token rename, not migration layer
**Rationale**: ~100+ `orange-*` or `rgba(249,115,22,...)` references across 25+ files. A compatibility layer (mapping orange→green) adds debt. Instead: redefine the `primary` color palette in `tailwind.config.mjs` AND do a global find-replace of `orange-500`, `orange-400`, `orange-600`, `orange-500/10`, `rgba(249,115,22`, and `rgba(255,107,0` with their Stitch equivalents. The `text-orange-*` to `text-green-*` rename is mechanical, applied per-PR within each file's scope.

---

## Data Flow

```
NutritionPage           → insforge.database.from('recetas').select('*')
DashboardPage           → historial_entrenamientos, rutinas, ejercicios, user_stats
ProfilePage (restored)  → perfiles (fetch+update), user_stats, avatares (storage)
BibliotecaPage          → rutinas (es_publica), yoga_rutinas (existing)
```

The `recetas` table already exists with columns: `nombre, descripcion, ingredientes[], instrucciones[], tiempo_preparacion, dificultad, calorias, proteinas, carbos, grasas, imagen_url`. 0 rows currently — data seeding is out of scope (admin panel already has CRUD via AdminRecetasPage).

---

## File Changes

### Phase 1 — Foundation + Auth (PR1)
| File | Action | Description |
|------|--------|-------------|
| `tailwind.config.mjs` | Modify | Replace orange primary with green `#13ec5b`, add surface tokens (`#1d100a` bg, `#2b1c16` surface), radius tokens |
| `src/styles/global.css` | Modify | Update `selection:` color, add CSS variable for `--color-primary` |
| `src/app/pages/LoginPage.tsx` | Modify | Split-screen layout: left brand panel (gradient, logo, tagline) + right form card |
| `src/app/pages/RegisterPage.tsx` | Modify | Same split-screen pattern as Login |

### Phase 2 — Main Pages (PR2)
| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/BibliotecaPage.tsx` | Modify | Stitch card grid, updated filter chips, "Momento de Mentalidad" widget section, "Probar Gratis" CTA cards |
| `src/app/pages/DashboardPage.tsx` | Modify | Stitch greeting design, XP/streak bar styling, tab active colors, chart colors, stat card redesign. All orange→green. |
| `src/app/pages/ProfilePage.tsx` | No change needed | Already has full BMR/TDEE/IMC/avatar crop — will become reachable |

### Phase 3 — Nutrition + Routes (PR3)
| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/NutritionPage.tsx` | **Create** | New page fetching from `recetas` table. Stitch recipe cards, difficulty filter, search, macro badges |
| `src/app/App.tsx` | Modify | Fix `/perfil` route (remove Navigate redirect), add `/nutricion` route, remove `/nutricion→/biblioteca` redirect |
| `src/app/components/AppLayout.tsx` | Modify | Stitch nav items/labels/colors, sidebar icons update |

### Phase 4 — About + Polish (PR4)
| File | Action | Description |
|------|--------|-------------|
| `src/pages/index.astro` | Modify | Stitch "Acerca de" hero, mission section, CTA buttons. All `rgba(255,107,0`→green |
| `src/pages/about.astro` | Modify | Same green swap, matching Stitch visual language |
| `src/layouts/BaseLayout.astro` | Modify | Orange selection color→green, top nav link colors |
| `src/app/components/YogaTimer.tsx` | Modify | `#ff6b00`→green stroke |
| All remaining files | Modify | Final orange→green pass across all files |

---

## Route Map (App.tsx)

| Route | Current | New |
|-------|---------|-----|
| `/perfil` | `<Navigate to="/dashboard">` | `<ProtectedRoute><ProfilePage/></ProtectedRoute>` |
| `/nutricion` | `<Navigate to="/biblioteca">` | `<ProtectedRoute><NutritionPage/></ProtectedRoute>` |
| `/nutricion` (public) | — | `<AppLayout><NutritionPage/></AppLayout>` (public access like Biblioteca) |

Decision: Nutrition is public (no login required to browse recipes), matching the Biblioteca pattern. `/profile` stays protected.

---

## Color Migration Strategy

1. **Tailwind config**: Change `colors.primary` to Stitch green. Add surface tokens as `colors.surface`, `colors.surface-high`, etc.
2. **CSS**: Update `selection:` to use `bg-green-500/30`. Keep background as `#0a0a0a` (Stitch bg is `#1d100a` — background change is Phase 4 polish).
3. **Per-PR scope**: Each PR replaces orange references ONLY in the files it touches. PR4 does final sweep on remaining files.
4. **Hardcoded rgba**: Find `rgba(249,115,22` → replace with `rgba(19,236,91` (green glow). Find `rgba(255,107,0` → replace with `rgba(19,236,91`.
5. **Tailwind class renames**: `bg-orange-500` → `bg-primary`, `text-orange-500` → `text-primary`, `border-orange-500/30` → `border-primary/30`, `hover:bg-orange-400` → `hover:bg-primary-light`, `from-orange-500` → `from-primary`.

---

## Interfaces / Contracts

```typescript
// NutritionPage — matching existing CatalogoItem pattern
interface Receta {
  id: string;
  nombre: string;
  descripcion?: string;
  ingredientes: string[];
  instrucciones: string[];
  tiempo_preparacion?: number;
  dificultad: 'facil' | 'media' | 'dificil';
  calorias?: number;
  proteinas?: number;
  carbos?: number;
  grasas?: number;
  imagen_url?: string | null;
}
```

---

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Nutrition calculations (nutrition.ts) | Existing tests, no changes |
| Component | NutritionPage rendering with mock data | Vitest + render mock recetas data |
| E2E | `/perfil` accessible, profile metrics visible | Playwright — navigate to `/perfil`, assert BMR visible |
| E2E | `/nutricion` shows recipes | Playwright — mount page, wait for recetas data |
| Visual | All orange→green replacements | Manual sweep per PR targeting `rgba(249,115,22`, `orange-`, `#ff6b00` |

---

## Migration / Rollout

No data migration. No feature flags. Each PR is independently mergeable and deployable:
- **PR1**: Color system changes may cause visual inconsistencies in pages not yet updated. Acceptable during transition.
- **PR2**: Restores profile route — "Editar Perfil" link now works.
- **PR3**: Nutrition route starts working.
- **PR4**: Final cleanup — no functional changes, visual-only.

Rollback: `git revert <sha>` per PR. No schema changes, no data loss.

---

## Open Questions

- [ ] Should NutritionPage be public (no login) like Biblioteca, or require auth? **Decision above: public.**
- [ ] Dashboard chart data currently uses `Math.random()` for bar heights — should transition to real per-day aggregates from `historial_entrenamientos`? **Out of scope (existing behavior).**
- [ ] Stitch "Momento de Mentalidad" widget — is this a hardcoded inspirational quote section or a dynamic fetch? **Assume hardcoded static content for now.**
