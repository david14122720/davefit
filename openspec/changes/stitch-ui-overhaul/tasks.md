# Tasks: Stitch UI Overhaul

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2000+ across ~20 files |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 (stacked to main) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Tailwind tokens + auth split-screen | PR 1 | Base: main. Foundation for all pages |
| 2 | Biblioteca + Dashboard redesign | PR 2 | Base: main. Requires tokens from PR1 |
| 3 | NutritionPage + route fixes | PR 3 | Base: main. Requires tokens from PR1 |
| 4 | About page + green sweep | PR 4 | Base: main. Final polish pass |

## Phase 1: Foundation & Auth (PR 1)

- [x] 1.1 `tailwind.config.mjs`: Replace orange primary with green `#13ec5b`, add warm-dark surface tokens (`#1d100a`, `#2b1c16`, `#3a281f`, `#4a3428`), glass token, 8px radius default
- [x] 1.2 `src/styles/global.css`: Update `selection:` to `bg-green-500/30`, add CSS custom properties for surface colors
- [x] 1.3 `src/app/pages/LoginPage.tsx`: Full split-screen — left brand panel (green radial glow, FitDave logo, tagline, stats, Google OAuth button) + right form panel (Bienvenido de Nuevo, email/password, Iniciar Sesión, divider)
- [x] 1.4 `src/app/pages/RegisterPage.tsx`: Same split-screen with Crea tu Cuenta, full name/email/password fields, Google OAuth
- [x] 1.5 Test: LoginPage renders both panels, Google button visible, form submits with valid data
- [x] 1.6 Test: RegisterPage validates required fields, matches split-screen layout

## Phase 2: Main Pages (PR 2)

- [x] 2.1 `src/app/pages/BibliotecaPage.tsx`: Stitch card grid — cover image, color-coded type badges (green=ejercicio, purple=yoga), duration/difficulty/equipment chips, Probar Gratis CTA; filter pills (Todo/Fuerza/Cardio/Yoga/HIIT) with green active state; Momento de Mentalidad widget with quote + breathing icon + Comenzar button
- [x] 2.2 `src/app/pages/DashboardPage.tsx`: Stitch layout — time-based greeting, streak + level badges, Entrenar ahora CTA, 3 tabs (Resumen/Biblioteca de Ejercicios/Mi Calendario) with green accent, stat cards, weekly chart, next workout suggestion, Explora la Biblioteca CTA
- [x] 2.3 Test: BibliotecaPage filter chips toggle active/inactive state correctly
- [x] 2.4 Test: DashboardPage tabs switch content panels, green accent on active tab

## Phase 3: Nutrition & Routes (PR 3)

- [x] 3.1 `src/app/pages/NutritionPage.tsx`: Create new page — recipe catalog grid from `recetas` table, search bar, difficulty chips (fácil/media/difícil), empty state (0 rows), subscription upgrade CTA; reuse BibliotecaPage card/fetching patterns
- [x] 3.2 `src/app/App.tsx`: Fix `/perfil` — replace `<Navigate to="/dashboard">` with `<ProtectedRoute><ProfilePage/></ProtectedRoute>`; add `/nutricion` as public route under AppLayout
- [x] 3.3 `src/app/components/AppLayout.tsx`: Update sidebar nav to Stitch — Entrenamientos, Nutrición, Progreso, Comunidad, Ajustes (gear icon), avatar; swap all orange hover/active states to green primary
- [x] 3.4 Test: `/perfil` renders ProfilePage with metrics (no redirect), `/nutricion` renders NutritionPage

## Phase 4: Nav & Polish (PR 4)

- [x] 4.1 `src/pages/index.astro`: Restyle hero section — green primary, replace all `text-primary`/`bg-primary`/`from-primary`/`rgba(orange)` references with green equivalents
- [x] 4.2 `src/layouts/BaseLayout.astro`: Update top nav — green Fit logo, Biblioteca link, Iniciar Sesión, Registro button; update selection color
- [x] 4.3 `src/app/components/YogaTimer.tsx`: Replace hardcoded `#ff6b00` with green `#13ec5b`
- [x] 4.4 Global sweep: Searched and replaced orange across 25+ files (Admin, Yoga, Profile, Routines, Comunidad, History, etc.)
- [x] 4.5 Test: Zero orange remnants confirmed via grep
- [x] 4.6 E2E test: Build passes cleanly, green primary renders correctly
