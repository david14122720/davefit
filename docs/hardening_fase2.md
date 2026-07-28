# Hardening Fase 2 — Refactorización Arquitectónica

**Fecha**: 2026-07-27
**Objetivo**: Reforzar la arquitectura del código sin agregar funcionalidades nuevas ni modificar modelos de base de datos.

---

## Resumen

Se identificaron y corrigieron **12 problemas** de arquitectura, mantenibilidad y seguridad, clasificados en tres niveles de impacto.

---

## Cambios Realizados

### 🔴 Alto Impacto (6)

| # | Problema | Solución | Archivos |
|---|----------|----------|----------|
| 1 | **NavLinks duplicado** — `NavLinks.tsx` y `MobileDrawer.tsx` definían el mismo array `navLinks` con datos idénticos | Se extrajo a `src/app/lib/navLinks.ts` como fuente única de verdad | `src/app/lib/navLinks.ts` (creado), `NavLinks.tsx`, `MobileDrawer.tsx` |
| 2 | **DOMPurify en servidor** — `sugerencias.ts` importaba `dompurify` (librería browser-only) en un endpoint Astro server-side | Se reemplazó con `sanitizeText()` — función server-safe que escapa HTML sin depender del DOM | `src/pages/api/suggestions.ts` |
| 3 | **Tipos duplicados** — `Perfil` definido tanto en `types/index.ts` como en `AuthContext.tsx`, con estructuras casi idénticas | Se eliminó la definición local en `AuthContext.tsx` y se importó desde `../../types` | `src/app/context/AuthContext.tsx` |
| 4 | **`User` con `[key: string]: any`** — El tipo `User` en `AuthContext.tsx` tenía un index signature que anulaba el type-checking | Se eliminó el index signature, manteniendo solo las propiedades conocidas | `src/app/context/AuthContext.tsx` |
| 5 | **App.tsx verboso** — 126 líneas con patrones repetitivos de route wrappers, layouts y guards | Se implementó route config declarativa con `RouteDef[]`, reduciendo a ~90 líneas y eliminando toda la duplicación de `RouteWrapper`/layout anidados | `src/app/App.tsx` |
| 6 | **DashboardPage: funciones inline duplicadas** — `getInicioSemana()` y `getSaludo()` definidas localmente, con `getInicioSemana` también existente en `stats.ts` | Se extrajeron a `src/app/lib/dates.ts` como utilidades compartidas | `src/app/lib/dates.ts` (creado), `DashboardPage.tsx` |

### 🟡 Medio Impacto (4)

| # | Problema | Solución | Archivos |
|---|----------|----------|----------|
| 7 | **`canvas-confetti` directo en WeeklyGoal** — importaba y llamaba `confetti()` directamente en lugar de usar el hook `useCelebration` existente | Se reemplazó por `celebrateAchievement()` del hook | `src/app/components/WeeklyGoal.tsx` |
| 8 | **Cálculo vacío repetido en gamification.ts** — El objeto default `{ xp_ganado: 0, nivel_anterior: 1, ... }` se definía inline en 2 branches de error | Se extrajo como constante `EMPTY_CALCULATION` | `src/lib/gamification.ts` |
| 9 | **Faltaban scripts de test en package.json** — `vitest` estaba instalado pero no había `test`, `test:watch`, `test:ui` ni `test:coverage` en `scripts` | Se agregaron los 4 scripts siguiendo la convención del proyecto | `package.json` |
| 10 | **Skeletons inline dispersos** — Cada página tenía su propio marcado de loading state inline | Se crearon componentes reutilizables: `SkeletonBar`, `SkeletonCard`, `DashboardSkeleton`, `ListSkeleton`, `GridSkeleton` | `src/app/components/Skeleton.tsx` |

### 🟢 Bajo Impacto (2)

| # | Problema | Solución | Archivos |
|---|----------|----------|----------|
| 11 | **`@ts-ignore` en ProfilePage** — 2 directivas que silenciaban errores sin registro | Se reemplazaron con type assertions explícitas (`as any` y `as Partial<Perfil>`) | `src/app/pages/ProfilePage.tsx` |
| 12 | **DashboardSkeleton inline** — DashboardPage tenía un skeleton de 16 líneas inline | Se reemplazó por `<DashboardSkeleton />` | `src/app/pages/DashboardPage.tsx` |

---

## Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `src/app/lib/navLinks.ts` | Constante compartida de navegación + tipos |
| `src/app/lib/dates.ts` | Utilidades de fecha (getInicioSemana, getSaludo, formatDateEs) |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/app/App.tsx` | Route config → -30% líneas, sin duplicación de wrappers |
| `src/app/components/NavLinks.tsx` | Importa desde `navLinks.ts` |
| `src/app/components/MobileDrawer.tsx` | Importa desde `navLinks.ts` |
| `src/app/components/WeeklyGoal.tsx` | `useCelebration` en vez de `confetti` directo |
| `src/app/components/Skeleton.tsx` | +5 componentes reutilizables |
| `src/app/context/AuthContext.tsx` | Perfil desde types/index, User sin index signature |
| `src/app/pages/DashboardPage.tsx` | `DashboardSkeleton`, utilidades desde `dates.ts` |
| `src/app/pages/ProfilePage.tsx` | `@ts-ignore` → type assertions |
| `src/pages/api/suggestions.ts` | DOMPurify → sanitizeText() server-safe |
| `src/lib/gamification.ts` | EMPTY_CALCULATION constante |
| `package.json` | +4 scripts de test |

---

## Verificación

- ✅ Build: `npm run build` → completo sin errores (1.62s)
- ✅ Tests: `npx vitest run` → **35 tests pasan** en 6 archivos
- ✅ Sin cambios en modelos de base de datos
- ✅ Sin cambios en funcionalidad existente

---

## Deuda Técnica Pendiente (para siguientes fases)

| Prioridad | Item | Notas |
|-----------|------|-------|
| Alta | `[...slug].astro` — catch-all muy complejo | El endpoint admin API handler es un switch masivo. Refactorizar a rutas individuales. |
| Alta | `api/admin/[...slug].ts` — switch de 500+ líneas | Misma familia, mejor como rutas separadas por recurso. |
| Media | `DashboardPage.tsx` — 400+ líneas | Dividir en componentes: StatsCards, ActivityChart, RecentSessions. |
| Media | `ProfilePage.tsx` — 500+ líneas | Separar avatar/crop, form de perfil, sección de stats. |
| Media | `YogaContext.tsx` — timer tick recrea objeto cada segundo | Extraer timer a contexto separado para evitar re-renders masivos. |
| Baja | `NutritionPage` y `BibliotecaPage` — patrón filter/chip/search duplicado | Extraer SearchFilterBar como componente compartido. |
| Baja | `UserMenu.tsx` — `user` casteado como `any` en 3 lugares | Tipar correctamente con el User de AuthContext o types. |
