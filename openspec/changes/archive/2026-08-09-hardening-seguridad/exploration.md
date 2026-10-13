# Exploration: Hardening de Seguridad — Hallazgos Auditados

> Artefacto de la fase `sdd-explore` para el cambio `hardening-seguridad`.
> Captura el conocimiento de `auditoria_seguridad.md` (que será borrado) + verificación en código y backend real.

## Current State

### 1. Exposición de email a anónimos y autenticados (CONFIRMADO — el más grave)

Políticas RLS reales en `perfiles` (verificadas vía InsForge, no asumidas):

| Política | Cmd | Roles | Qual | Problema |
|---|---|---|---|---|
| `anon_read_leaderboard_perfiles` | SELECT | anon | `true` | Anónimos leen TODAS las columnas de TODOS los perfiles, incluido `email`, `fecha_nacimiento`, `peso_actual`… |
| `perfiles_read_authenticated` | SELECT | authenticated | `true` | **El MISMO leak para cualquier usuario logueado** — no estaba en la auditoría, mismo vector. |
| `perfiles_owner_all_v3` | ALL | public | `id = auth.uid()` | Correcta (propia fila). |
| `project_admin_policy` | ALL | project_admin | `true` | Correcta. |

**Causa raíz**: RLS es row-level, no column-level. `qual=true` otorga todas las filas; la app solo selecciona `id, nombre_completo, avatar_url`, pero la anon key es pública (va en el bundle frontend) y cualquiera puede llamar `.select('*')` o `.select('email')` directo contra PostgREST.

`user_stats` tiene el mismo patrón: `anon_read_leaderboard_stats` y `Users can read all stats` (authenticated) con `qual=true` → expone `weekly_score`, `monthly_score`, `ultimo_entreno`, `longest_streak`, `racha_bonus`, `nivel` vía `.select('*')`.

**Quién usa el leaderboard**: `ComunidadPage` en `/app/comunidad` — ruta **PÚBLICA** (en `App.tsx`: `layout: 'public'`, sin guard). La política anon es funcionalmente necesaria: el leaderboard funciona sin login.

**Columnas que NECESITA el leaderboard**:
- `perfiles`: `id`, `nombre_completo` (se muestra solo el primer nombre: `.split(' ')[0]`), `avatar_url`.
- `user_stats`: `user_id`, `xp_total` (como total_score), `total_workouts`, `dias_racha`.
- **Bug oportunista encontrado**: `ComunidadPage` lee `stats?.streak_days`, pero la columna real es `dias_racha` → la racha siempre muestra 0. Fix opcional fuera de scope de seguridad.

**Otro consumidor anónimo**: `src/pages/api/stats.ts` (ruta Astro server-side con cliente anon) cuenta filas de `perfiles` (`count: 'exact', head: true`) para el landing. Tras el fix debe contar contra la vista.

**Otras tablas con SELECT público**: `ejercicios`, `recetas`, `rutinas` (solo públicas), `site_stats`, `suggestions` (solo `is_approved`), `yoga_rutinas`, `yoga_rutina_posiciones` — contenido, sin PII. `historial_entrenamientos`, `workout_completions`, `yoga_progreso` — solo dueño/authenticated. Nada más filtra PII.

**Verificado**: ningún otro query en la app lee filas de OTROS usuarios en `perfiles` (AuthContext → propia, yogaApi → propia, admin-auth → propia, admin routes no tocan `perfiles`). El patrón `EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol='admin')` en políticas de otras tablas lee solo la propia fila → sigue funcionando con la política de dueño.

### 2. CSP `'unsafe-inline'` en script-src (CONFIRMADO, endurecible)

`src/middleware.ts` línea 7-8: `script-src 'self' 'unsafe-inline' https://accounts.google.com` (+ `script-src-elem` idéntico).

**Inventario real de scripts inline en producción**:
- **ÚNICO script inline ejecutable**: el "SW killer" en `BaseLayout.astro` (línea 87-101, `<script is:inline>`), contenido estático.
- Bloques `application/ld+json` (línea 104-105): **data blocks** — no están sujetos a `script-src` según CSP3; no requieren unsafe-inline.
- Shell SPA `src/pages/[...slug].astro`: `client:only="react"`, sin inline. Astro inyecta los bundles como `<script type="module" src="...">` externos.
- Sin event handlers inline (`onclick=`, `onload=`), sin atributos `style="` en plantillas Astro.
- **Hash del SW killer (bytes exactos actuales)**: `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=` — debe recalcularse si cambia el contenido.

**Google OAuth es flujo REDIRECT, no GSI popup**: el SDK `signInWithOAuth` hace `window.location.href = authUrl` (navegación completa al backend InsForge, que redirige a Google y vuelve con `#access_token`). NO carga scripts ni iframes de `accounts.google.com` en el origen DaveFit → `https://accounts.google.com` en `script-src` y `frame-src` parece **eliminable**. Riesgo documentado: si el backend cambiara a GSI popup/one-tap, habría que reintroducirlo.

**Astro 7 CSP nativo (`security.csp` config) NO sirve aquí**: solo scripts/styles, se inyecta como `<meta>`, **incompatible con view transitions** (este proyecto usa `ClientRouter` de `astro:transitions`) y con scripts externos. Descartado — se endurece el header en middleware.

**`style-src 'unsafe-inline'` se MANTIENE**: React SSR emite atributos `style=""` (framer-motion, estilos inline) y el critical CSS es inline. Riesgo bajo; no es el vector XSS principal.

**Dev mode**: Vite HMR necesita inline/eval → el CSP endurecido rompería dev. El middleware ya ramifica `import.meta.env.PROD` (HSTS) → patrón natural: CSP relajado en DEV, endurecido en PROD.

### 3. Rate-limit client-side (CONFIRMADO — aceptable con tradeoff documentado)

`src/lib/auth.ts`: 5 intentos / 10 min, bloqueo 30 min en `localStorage` — eludible limpiando storage o cambiando de navegador.

**Protecciones reales disponibles en el backend InsForge** (verificado en metadata):
- Config auth del proyecto: `passwordMinLength: 6`, sin requisitos de complejidad, `requireEmailVerification: false` (más débil que el cliente — el cliente exige 8+ y complejidad).
- No hay rate-limiting por IP visible/configurable en la plataforma InsForge.
- PostgREST no trae anti fuerza-bruta integrado.
- Lo que SÍ mitiga: `sanitizeAuthError` impide enumeración de cuentas (nunca distingue "usuario no existe" de "password incorrecta"), `normalizeEmail` normaliza entradas.

**Decisión propuesta**: aceptar el rate-limit client-side como fricción UX + documentar el tradeoff en el spec. La defensa real requeriría rate-limiting a nivel plataforma (fuera de control del proyecto) o un proxy Astro para `/auth` (cambio grande, fuera de scope). Riesgo residual BAJO para este proyecto (app estudiantil pequeña, sin monetización, 2 usuarios reales hoy).

### 4. isAdmin UI-only (CONFIRMADO — aceptable)

`ProtectedRoute` con `adminOnly` solo oculta la UI; un usuario puede parchear `isAdmin` en React DevTools y VER el panel admin. Pero TODA operación pasa por `adminFetch` → `/api/admin/*` → `verifyAdmin()` (JWT + rol en DB por request, `src/lib/admin-auth.ts`). Sin fuga de datos: las rutas admin no exponen `perfiles` de otros usuarios (verificado en `[...slug].ts`: solo ejercicios, rutinas, yoga, stats). Aceptable, documentar.

### Lo que YA está bien (confirmado, NO tocar)

- `verifyAdmin()` server-side en cada request de `/api/admin/[...slug].ts`. ✓
- Trigger `protect_roles()` SECURITY DEFINER en `perfiles` (INSERT + UPDATE) bloquea escalada de rol vía PATCH. ✓ (presente en schema real)
- Magic bytes (`src/lib/fileValidation.ts`), CSRF double-submit en middleware + `getCsrfToken`, allowlist `ALLOWED_PROFILE_FIELDS`. ✓

## Affected Areas

- **DB InsForge/Postgres (via raw SQL)**: `perfiles`, `user_stats` — políticas + vistas nuevas.
- `src/app/pages/ComunidadPage.tsx` — consultar `perfiles_public` y `user_stats_public`.
- `src/pages/api/stats.ts` — count contra `perfiles_public`.
- `src/middleware.ts` — CSP PROD endurecido + CSP DEV relajado.
- `src/layouts/BaseLayout.astro` — comentario para mantener el hash del SW killer (o convertir a bundle externo).
- Tests: middleware CSP (nuevo), ComunidadPage/stats (mock de vistas), runner `npx vitest run`.

## Approaches

### A. Vistas restringidas + ajuste de políticas (RECOMENDADO)

```sql
CREATE VIEW public.perfiles_public AS
  SELECT id, nombre_completo, avatar_url FROM public.perfiles;
CREATE VIEW public.user_stats_public AS
  SELECT user_id, xp_total, total_workouts, dias_racha FROM public.user_stats;
GRANT SELECT ON public.perfiles_public TO anon, authenticated;
GRANT SELECT ON public.user_stats_public TO anon, authenticated;

DROP POLICY anon_read_leaderboard_perfiles ON public.perfiles;
DROP POLICY perfiles_read_authenticated ON public.perfiles;  -- dueño sigue cubierto por perfiles_owner_all_v3
DROP POLICY anon_read_leaderboard_stats ON public.user_stats;
DROP POLICY "Users can read all stats" ON public.user_stats;
CREATE POLICY user_stats_owner ON public.user_stats
  FOR SELECT USING (user_id = auth.uid());  -- OBLIGATORIO: getUserStats (Dashboard) lee propia fila
```

- Pros: patrón recomendado por Supabase para ocultar columnas; cierra anon Y authenticated; cero cambio de privilegios por columna (evita romper `select('*')` del dueño); compatible con las subqueries admin (`id = auth.uid()`).
- Cons: requiere cambios de código en 2 archivos; las vistas security-definer confían en el owner de la tabla (OK en InsForge); hay que añadir `user_stats_owner` o se rompe el Dashboard.
- Effort: Medium.

### B. REVOKE por columna (`REVOKE SELECT(email) ON perfiles FROM anon, authenticated`)

- Pros: cambio mínimo (solo SQL).
- Cons: los privilegios por columna son **independientes de la fila** → el DUEÑO perdería el email de su propia fila también (rompe `loadPerfil` con `select('*')`); no cierra el leak de authenticated si se deja el email; no cubre el resto de columnas sensibles (`peso_actual`, `fecha_nacimiento`…). Insuficiente solo.
- Effort: Low, pero incompleto — descartado como fix principal.

### C. RPC `get_public_leaderboard()` SECURITY DEFINER

- Pros: patrón ya usado en el proyecto (`process_workout_completion`, `protect_roles`); control total del payload.
- Cons: más código (función + invoker + rate-limit ya existente en `invokeRpc`); el count del landing no lo cubre; menos transparente que una vista.
- Effort: Medium-High. Alternativa válida si la vista fallara en InsForge.

### D. CSP: hash sha256 + limpieza de accounts.google.com + split DEV/PROD

```js
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self' 'sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A='",
  "script-src-elem 'self' 'sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A='",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // img-src, font-src, connect-src, frame-ancestors, object-src, base-uri, form-action: sin cambios
];
// DEV: CSP actual (con 'unsafe-inline' + accounts.google.com) para que HMR funcione.
```

- Alternativa al hash: convertir el SW killer en script empaquetado (quitar `is:inline`) → cero scripts inline en prod, sin hash que mantener; ejecuta un poco más tarde (module scripts son deferred).
- Pros: elimina `'unsafe-inline'` de script-src en prod → mitiga XSS por inyección de script; elimina entrada muerta de Google.
- Cons: el hash se invalida si se edita el script (hay que documentarlo); riesgo de que algún inline no inventariado rompa el sitio en prod → mitigar con paso de verificación (build + preview + grep del HTML + consola).
- Effort: Low-Medium.

### E. Rate-limit server-side (documentado, NO implementar ahora)

- Pros: defensa real contra fuerza bruta.
- Cons: requiere proxy Astro para auth (cambio arquitectónico grande) o feature de plataforma InsForge inexistente. Fuera de scope; documentar en spec como riesgo aceptado.
- Effort: High — descartado para este cambio.

## Recommendation

1. **A + D**: vistas restringidas + ajuste de políticas (fix del email — anon y authenticated) Y endurecer CSP script-src con hash + quitar accounts.google.com + split DEV/PROD. Son independientes, se pueden encadenar en slices separados del mismo cambio.
2. Documentar en el spec: rate-limit client-side aceptado (E, tradeoff), isAdmin UI-only aceptado (hallazgo 4).
3. Opcional fuera de scope: bug `streak_days`→`dias_racha` en ComunidadPage.

## Risks

- **Romper el leaderboard público** si la vista/GRANT no se aplica antes que el cambio de código (orden de ejecución: SQL primero, código después; o mismo deploy).
- **Romper el Dashboard** si se elimina la política de lectura amplia de `user_stats` sin añadir `user_stats_owner` (getUserStats lee la propia fila).
- **CSP prod rompe el sitio** si hay algún inline script no inventariado (Astro/Vite build) → mitigar con verificación build+preview y ramificación DEV/PROD.
- **Hash del SW killer obsoleto** tras editar BaseLayout → comentario en el código.
- **Quitar accounts.google.com** del CSP: si InsForge migra a GSI popup/one-tap se rompe Google login → documentado en spec.
- Políticas de otras tablas con subquery `perfiles.rol='admin'`: siguen OK (lectura de fila propia), pero verificar tras el cambio con un smoke test de admin.

## Ready for Proposal

Sí — hallazgos verificados en código Y backend real (schema InsForge), fix diseñado, riesgos mapeados. El proponente debe decidir: un solo cambio con slices (SQL + código) o dos cambios separados (db-hardening / csp-hardening). Nota para el usuario: la auditoría decía "RLS pendiente de revisar" — la revisión está hecha: el leak de email existe de verdad y hay leak adicional de authenticated.
