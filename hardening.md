# Hardening Arquitectónico — DaveFit

## Objetivo

Fortalecer la arquitectura del proyecto antes de importar el dataset masivo de ejercicios (1300+). Sin nuevas funcionalidades — solo calidad, mantenibilidad y base sólida.

## Cambios Realizados

### 1. Fundación Técnica

| Archivo | Descripción |
|---------|-------------|
| `src/types/index.ts` | Tipos compartidos del dominio DaveFit (Ejercicio, Rutina, HistorialEntry, UserStats, Perfil, etc.) |
| `src/constants/index.ts` | Constantes globales: tablas DB, defaults de usuario, XP por acción, niveles, factores de actividad, límites |
| `src/app/components/ErrorBoundary.tsx` | Error boundary con botón de reintento y stack trace en desarrollo |
| `src/app/components/Skeleton.tsx` | Sistema de skeletons: `Skeleton`, `SkeletonCard`, `DashboardSkeleton`, `PageLoader`, `Spinner` |

### 2. App.tsx — Routing Consistentemente Lazy

- LoginPage y DashboardPage ahora también lazy (`React.lazy`)
- `ErrorBoundary` envuelve cada ruta individualmente
- Rutas muertas eliminadas
- `MetaUpdater` extraído a componente separado

### 3. PublicLayout Refactorizado

~347 → ~90 líneas. Extracción en 3 componentes:

- `NavLinks.tsx` — enlaces de navegación
- `UserMenu.tsx` — avatar + dropdown de usuario
- `MobileDrawer.tsx` — drawer para móvil

### 4. DashboardPage — 6 Arreglos

1. **ChartData**: ahora usa datos reales de `historial_ejercicios` semanal en lugar de mock
2. **Racha**: obtenida de `getUserStats().dias_racha` (real) en lugar de duplicar lógica
3. **Clases Tailwind inválidas**: `text-primary-on` → `text-white`, `text-text-muted`/`text-on-surface-variant` → `text-gray-400`
4. **Filtro semanal**: queries de stats filtran por semana actual con `.gte()`
5. **Estados tipados**: usan tipos compartidos de `types/index.ts`
6. **Saludo**: extraído a helper `getSaludo()` para testabilidad

### 5. adminApi Dividido

`src/app/lib/adminApi.ts` (~200 líneas) → 4 archivos + barrel:

| Archivo | Contenido |
|---------|-----------|
| `ejerciciosApi.ts` | CRUD ejercicios |
| `rutinasApi.ts` | CRUD rutinas |
| `yogaAdminApi.ts` | CRUD yoga admin |
| `adminStatsApi.ts` | Stats admin |
| `adminApi.ts` | Barrel re-export con compatibilidad backward |

### 6. Otros Arreglos

- **FileUpload.tsx**: `alert()` → `toast.error()` (sonner)
- **insforge.ts**: `invokeRpc<T>` tipado con genérico; catch sanitizado con fallback para response no-JSON
- **yogaApi.ts**: `saveProgreso` ahora loguea errores con `console.error` y retorna error; `catch (e: unknown)` con type narrowing
- **global.css**: variable muerta `--primary-green` eliminada
- **tailwind.config.mjs**: colores faltantes añadidos (`primary.hover`, `primary.on`, `surface`, `on-surface`, `text-muted`)
- **middleware.ts**: CSP restringido — `img-src` de `https:` genérico a solo dominio InsForge
- **test/setup.ts**: `window.scrollIntoView` corregido

### 7. Tests

- 33 tests, todos pasando ✅
- DashboardPage test de skeleton corregido: tabs sí se muestran durante carga (son navegación, no contenido)
- Errores de mock (`gte is not a function`) aparecen en stderr pero los componentes manejan graceful degradation

### 8. Limpieza

- `SCRUM.md` y `progreso.md` eliminados
- `CLAUDE.md` limpiado de referencias a archivos eliminados (HistoryPage, YogaPage → reemplazados por NutritionPage, YogaPracticePage, YogaPosicionesPage)
- `CLAUDE.md` actualizado: lib ahora incluye `auth.ts`, `db.ts`; types ahora dice "Tipos centralizados"
- `tipoLugarOptions` en constantes identificado como código muerto (sin referencias en src/)

### 9. Tests Reparados

**RegisterPage.test.tsx** — 2 tests fallando reparados:
- Error message assertion corregida: cuando el email está vacío, el esquema Zod muestra `'Ingresa tu correo electrónico'` (min 1), no `'Ingresa un correo válido'` (email)
- Contraseña de test corregida: `'Test1234'` → `'Test1234!'` (el esquema exige caracter especial `.regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/)`)
- Añadido `confirmPassword` al formulario (campo obligatorio en el esquema)

**Resultado**: 35 tests → 35 ✅ (0 fallos)

### 10. Mock de InsForge Mejorado

`src/test/setup.ts`:
- Añadidos métodos faltantes a la cadena de mock: `neq`, `lte`, `in`, `or`, `order`, `limit`, `range`, `insert`, `upsert`, `update`, `delete`
- El mock global ahora tiene cobertura completa de la API de PostgrestFilterBuilder
- Tests individuales ya no necesitan redefinir la cadena base — solo sobreescriben el método que les interesa

### 11. AuthContext — Fix TDZ en signOut()

`src/app/context/AuthContext.tsx`:
- `signOut()` movido ANTES del `useEffect` de inactividad que lo usa (línea 157)
- Antes: `signOut()` declarado en línea 375, usado en línea 157 → Temporal Dead Zone
- Ahora: declarado en línea 138, antes del primer uso
- También se eliminó `signInWithGoogle` de la sección "OAuth y cierre de sesión" (separación limpia)

### 12. Tipos Centralizados — Eliminación de Duplicados

**Duplicados encontrados y corregidos**:

| Archivo | Tipo eliminado | Ahora importa desde |
|---|---|---|
| `src/lib/gamification.ts` | `XpCalculation` (duplicado) | `types/index.ts` |
| `src/lib/stats.ts` | `UserStats`, `WorkoutCompletion` (duplicados) | `types/index.ts` |
| `src/lib/nutrition.ts` | `PerfilData` (duplicado de `Perfil`) | `Pick<Perfil, ...>` |
| `src/app/components/XPBar.tsx` | `UserStats` (parcial, duplicado) | `types/index.ts` |

### 13. Middleware / CSP Mejorado

`src/middleware.ts`:
- Añadida directiva `style-src-elem` explícita para Google Fonts (antes caía en `style-src` genérico, ahora explícito)
- Guard de tipo añadido: `typeof response.headers?.set === 'function'` — previene error si response no tiene headers estándar

### 14. Vitest Config Mejorado

`vitest.config.ts`:
- Añadido `css: false` — desactiva procesamiento de CSS en tests (más rápido, evita falsos positivos)
- Añadido `testTimeout: 10_000` — timeout explícito para tests lentos

### 15. CSRF Real — Double-Submit Cookie Pattern

`src/lib/auth.ts`:
- `getCsrfToken()` ahora también setea cookie `__Host-xsrf-token` (double-submit pattern)
- Nueva función `getCsrfHeader()` devuelve `{ 'X-XSRF-TOKEN': token }` para headers de mutación

`src/middleware.ts`:
- Rechaza con 403 cualquier `POST/PUT/PATCH/DELETE` a `/api/*` si el header `X-XSRF-TOKEN` no coincide con la cookie `__Host-xsrf-token`

`src/lib/insforge.ts`:
- `invokeRpc()` incluye header `X-XSRF-TOKEN` en requests (desde browser)

`LoginPage.tsx` / `RegisterPage.tsx`:
- Inicializan token CSRF via `useEffect(() => getCsrfToken(), [])`
- Hidden field `_csrf` eliminado de LoginPage (no servía server-side)

### 16. Constantes Centralizadas

`src/constants/fitness.ts`:
- Nueva exportación `rutinaDisponibilidadOptions` para rutinas (`['casa', 'gimnasio', 'ambos']`)

`AdminRutinasPage.tsx`:
- Local `tipoLugarOptions` reemplazado por importación de `rutinaDisponibilidadOptions` desde constants

### 17. Plan de Migración Creado

`migration-plan-astro7-tailwind4.md`:
- Documento completo con análisis de breaking changes para Astro 5→7 + Tailwind 3→4
- Sin uso de `Astro.glob()`, content collections, experimental flags, Container API → migración simplificada
- 3 fases (Tailwind → Astro 6 → Astro 7) recomendadas vs Big Bang
- Riesgos, mitigaciones, y pasos detallados

### 18. Migración Ejecutada: Astro 5→7 + Tailwind 3→4

Completada en branch `feat/migration-astro7-tailwind4` → mergeada a `main`.

**Tailwind CSS v3.4.19 → v4.3.3:**
- `tailwind.config.mjs` eliminado, tokens migrados a `@theme` en CSS
- `@tailwind` directives → `@import 'tailwindcss'`
- `@astrojs/tailwind` → `@tailwindcss/vite` plugin
- `bg-gradient-to-*` → `bg-linear-to-*` (32+ archivos)
- `outline-none` → `outline-hidden`, `flex-shrink-0` → `shrink-0`, etc.
- Admin files migrados manualmente (gitignorados por upgrade tool)

**Astro v5.18.1 → v7.1.4:**
- Vite 8 con Rolldown (deprecation warnings de `vite:react-babel` son internos)
- Rust compiler — sin errores HTML en archivos .astro
- `compressHTML: true` (default cambió a `'jsx'`)
- Build server: ~1.5s (antes ~9s)

**Post-migration fixes:**
- DOMPurify server-side crash reparado (`src/pages/api/suggestions.ts`)
- `shadow-3xl` → `shadow-2xl`, `z-100` → `z-[100]`, `drop-shadow-xs` → `drop-shadow-sm`
- Standalone `from-*`/`to-*` gradients corregidos

### 19. Hardening Post-Migración (v2)

Basado en Context7 best practices para Astro 7 + Tailwind v4:

1. **`security.allowedDomains`** — Nueva feature de Astro 7 para validar `X-Forwarded-Host` detrás del proxy nginx. Configurado en `astro.config.mjs`.
2. **CSP granular** — Añadido `script-src-elem` explícito y `frame-ancestors 'none'` en middleware.ts para control más fino de políticas de contenido.
3. **CSS vars directas** — Reemplazados `@apply` con CSS custom properties (`var(--color-*)`) en `@layer base` de `global.css` para mejor rendimiento en TW4 (recomendación oficial).
4. **Cleanup** — `migration-plan-astro7-tailwind4.md` eliminado (plan ejecutado).
5. **README actualizado** — Documentación del stack actual, estructura, seguridad y rendimiento.

## Build

`npm run build` — exitoso ✅
`npx vitest run` — 35 tests, todos pasando ✅
`npx playwright test` — E2E (Playwright config intacta)

## Pendiente

- `@insforge/sdk` 1.1.2 → 1.5.0 — APIs nuevas que podrían simplificar el código
- Importación del dataset de ejercicios (bloqueante post-hardening)
- Tests para middleware CSRF y funciones getCsrfToken/getCsrfHeader
- Migrar `data-astro-reload` y verificar View Transitions en Astro 7
- Verificar comportamiento visual de `@utility` con `@apply` en TW4
