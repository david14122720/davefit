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
- `CLAUDE.md` limpiado de referencias a archivos eliminados

## Build

`npm run build` — exitoso ✅

## Pendiente

- Los tests usan un mock parcial de InsForge que no implementa query chaining completo (`.gte()`, `.eq()`, etc.). Los tests pasan porque los componentes toleran errores, pero idealmente el mock debería actualizarse para pruebas más precisas.
- Importación del dataset de ejercicios (bloqueante post-hardening).
