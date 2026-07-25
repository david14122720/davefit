# Delta Spec: Stitch UI Overhaul

## Domain Coverage

Single consolidated spec covering all UI changes (design tokens, auth, pages, navigation). Nutrition is specified separately at `openspec/specs/nutrition/spec.md`.

## Color Token Requirements

| Token | Old Value | New Value |
|-------|-----------|-----------|
| `primary.DEFAULT` | `#ff6b00` | `#13ec5b` |
| `primary.light` | `#ff8533` | `#3ff07a` |
| `primary.dark` | `#e65100` | `#0cb848` |
| `primary.glow` | `rgba(255,107,0,0.3)` | `rgba(19,236,91,0.3)` |
| `background.dark` | `#0a0a0a` | `#1d100a` |
| `background.card` | `#141414` | `#2b1c16` |
| `background.surface` | `#1e1e1e` | `#3a281f` |
| `background.elevated` | `#252525` | `#4a3428` |
| `background.glass` | `rgba(20,20,20,0.8)` | `rgba(43,28,22,0.8)` |

The system MUST replace all hardcoded `#ff6b00`, `#e65100`, `orange-500`, `orange-*` references with their green equivalents. All border-radius SHALL use `rounded-lg` (8px) as the default, replacing `rounded-2xl` (16px) where Stitch specifies 8px roundness.

**Scenario**: Global search confirms no orange remnants
- GIVEN the refactored codebase
- WHEN searching for `#ff6b00`, `#e65100`, `orange-500`, `rgba(249,115,22`
- THEN zero matches remain

## Auth Split-Screen

### Requirement: Login Page Redesign

The system MUST render a two-panel layout: left brand panel (dark green gradient, "FitDave" logo, stats, Google OAuth button) + right form panel (email/password fields, "O CONTINÚA CON EMAIL" divider).

#### Scenario: Left panel shows branding

- GIVEN a user visits `/login`
- THEN the left 50% panel shows: FitDave logo, tagline ("Entrena. Crece. Transforma."), stats (usuarios, ejercicios)
- AND a prominent "Continuar con Google" button with Google icon
- AND background has green (#13ec5b) radial glow

#### Scenario: Right panel shows form

- GIVEN the login page renders
- THEN the right 50% panel shows: "Bienvenido de Nuevo" title, email input, password input with show/hide toggle
- AND a divider "O CONTINÚA CON EMAIL" (uppercase, small, centered)
- AND "Iniciar Sesión" button in green (#13ec5b)
- AND "¿No tienes cuenta? Regístrate" link

### Requirement: Register Page Redesign

The system MUST match the same split-screen layout with registration fields.

#### Scenario: Register has name + email + password

- GIVEN a user visits `/register`
- THEN left panel matches login (branding)
- AND right panel shows "Crea tu Cuenta" with full name, email, password fields, and Google OAuth

## Biblioteca Redesign

### Requirement: Stitch Card Grid

The system MUST render exercise/yoga cards matching Stitch's design — cover image, type badges (color-coded: green for ejercicio, purple for yoga), duration/difficulty/equipment chips, "Probar Gratis" CTA button.

#### Scenario: Filter chips match Stitch

- GIVEN the Biblioteca page loads
- THEN filter chips display as pills: Todo, Fuerza, Cardio, Yoga, HIIT
- AND active chip uses green (#13ec5b) background with white text
- AND inactive chips use surface (#2b1c16) background with gray text

#### Scenario: "Momento de Mentalidad" widget

- GIVEN the Biblioteca page has loaded
- THEN a "Momento de Mentalidad" inspirational card appears above the grid
- AND it shows a motivational quote, a breathing animation icon, and a "Comenzar" button

## Dashboard Redesign

### Requirement: Stitch Dashboard Layout

The system MUST display: personalized greeting (time-based), streak badge + level badge, "Entrenar ahora" CTA, 3 tabs (Resumen/Biblioteca de Ejercicios/Mi Calendario), objetivo actual progress bar, última actividad card, calorías quemadas stat, weekly activity chart, next workout suggestion card, "Explora la Biblioteca" CTA.

#### Scenario: Tabs use green accent

- GIVEN the Dashboard renders
- THEN the three tabs use green (#13ec5b) for active state instead of orange
- AND tab labels match: "Resumen", "Biblioteca de Ejercicios", "Mi Calendario"

## Profile Restoration

### Requirement: Profile Metrics on Dashboard

The system MUST restore `/perfil` as a working route showing BMR, TDEE, IMC calculation, weight/height, age, avatar crop upload, and gamification XP bar. Currently `/perfil` redirects to `/dashboard`.

#### Scenario: Profile route accessible

- GIVEN the user navigates to `/perfil`
- THEN the route renders ProfilePage with metrics (BMR, TDEE, IMC) computed from `perfil` data
- AND does NOT redirect to `/dashboard`

#### Scenario: "Editar Perfil" button works

- GIVEN the user is on Dashboard "Perfil" tab
- WHEN they click "Editar Perfil"
- THEN it navigates to `/perfil` (not a broken redirect)

### Requirement: Route Fix

| Route | Current Behavior | Required Behavior |
|-------|-----------------|-------------------|
| `/perfil` | Navigate to `/dashboard` | Render ProfilePage |
| `/nutricion` | Navigate to `/biblioteca` | Render NutritionPage |

## Navigation Restructure

### Requirement: Stitch Nav Items

The system MUST update AppLayout sidebar and BaseLayout.astro top nav to match Stitch.

#### Scenario: Sidebar matches Stitch

- GIVEN the user opens the sidebar
- THEN items display in order: FitDave logo, Entrenamientos, Nutrición, Progreso, Comunidad, Ajustes (gear icon), avatar
- AND all orange hover/active states use green instead

#### Scenario: BaseLayout top nav updated

- GIVEN a non-authenticated user visits any public page
- THEN the top nav shows: DaveFit logo (green "Fit"), Biblioteca link, Iniciar Sesión, Registro button
- AND all orange references replaced with green

## About Page

### Requirement: Index.astro Restyle

The system MUST update `src/pages/index.astro` to use green primary and match Stitch's "Acerca de FitDave" screen.

#### Scenario: All primary references updated

- GIVEN the landing page renders
- THEN all `text-primary`, `bg-primary`, `border-primary`, `shadow-[...primary...]` references render in green (#13ec5b)
- AND no orange references remain in the file
