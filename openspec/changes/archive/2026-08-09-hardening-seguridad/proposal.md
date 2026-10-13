# Proposal: Hardening de Seguridad

## Intent

Deuda de seguridad verificada en backend real InsForge y código. Las políticas RLS `anon_read_leaderboard_perfiles` y `perfiles_read_authenticated` (SELECT qual=true) exponen TODAS las columnas de `perfiles` (email, fecha_nacimiento, peso_actual) a anónimos y a cualquier usuario autenticado; `user_stats` tiene el mismo patrón y carece de política de dueño. Además, `script-src` usa `'unsafe-inline'` y una entrada muerta de `accounts.google.com`. Este cambio cierra el leak de PII, endurece el CSP en PROD, documenta los tradeoffs aceptados (rate-limit client-side, isAdmin UI-only) y elimina `auditoria_seguridad.md`, reemplazándolo por el rastro SDD (exploration.md + proposal + specs + verify-report).

## Scope

### In Scope
- **SQL/BD**: vistas `perfiles_public` (id, nombre_completo, avatar_url) y `user_stats_public` (user_id, xp_total, total_workouts, dias_racha); GRANT SELECT a anon/authenticated; DROP de 4 políticas amplias (`anon_read_leaderboard_perfiles`, `perfiles_read_authenticated`, `anon_read_leaderboard_stats`, `"Users can read all stats"`); CREATE `user_stats_owner` (user_id = auth.uid()).
- **Código**: `src/app/pages/ComunidadPage.tsx` consulta las vistas; `src/pages/api/stats.ts` cuenta contra `perfiles_public`.
- **CSP**: `src/middleware.ts` split DEV/PROD; PROD con `script-src 'self' + sha256` del SW killer y sin `accounts.google.com`; comentario de mantenimiento del hash en `src/layouts/BaseLayout.astro`.
- **Docs**: borrar `auditoria_seguridad.md` (rastro SDD lo sustituye); documentar tradeoffs rate-limit e isAdmin en spec.
- **Tests**: vitest (CSP middleware, ComunidadPage/stats con mock) + smoke SQL.

### Out of Scope
- Rate-limit server-side / proxy Astro para auth (defensa real = plataforma InsForge, riesgo aceptado y documentado).
- Enforcement client-side de isAdmin (mitigado server-side por `verifyAdmin()`, aceptado).
- Bug `streak_days` → `dias_racha` en ComunidadPage (fix opcional, fuera de alcance).
- `style-src 'unsafe-inline'` (se mantiene), CSP nativo de Astro (`security.csp`), migración a RPC `get_leaderboard`.

## Capabilities

### New Capabilities
- `data-access-security`: vistas restringidas + políticas RLS que limitan el acceso a `perfiles`/`user_stats` (acceso público solo a columnas públicas, dueño a su fila completa).
- `content-security-policy`: header CSP endurecido en PROD (hash script, sin unsafe-inline ni accounts.google.com) con split DEV/PROD en middleware.

### Modified Capabilities
None — no cambia comportamiento a nivel spec de las capabilities existentes (`ejercicios-import`, `nutrition`, `workout-practice`).

## Approach

Un solo cambio con 3 slices encadenados (auto-chain → PRs encadenados):
1. **SQL/BD primero** (nunca código antes, o rompe el leaderboard): migración con vistas + GRANTs + DROP de políticas amplias + `user_stats_owner` en el mismo deploy (sin él, `getUserStats` del Dashboard se rompe). Verificar con smoke queries por rol.
2. **Código**: ComunidadPage y stats.ts apuntan a las vistas; tests con mock.
3. **CSP**: split DEV/PROD en middleware (patrón ya existente para HSTS); PROD con sha256 `iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=`; verificación build + preview + grep HTML + consola.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| Backend InsForge (`perfiles`, `user_stats`) | Modified | Vistas públicas + políticas RLS (raw SQL vía MCP) |
| `src/app/pages/ComunidadPage.tsx` | Modified | Consulta `perfiles_public` / `user_stats_public` |
| `src/pages/api/stats.ts` | Modified | Count contra `perfiles_public` (línea 9) |
| `src/middleware.ts` | Modified | CSP PROD endurecido + DEV relajado (líneas 5-19) |
| `src/layouts/BaseLayout.astro` | Modified | Comentario hash SW killer (línea 87) |
| `auditoria_seguridad.md` | Removed | Reemplazado por rastro SDD |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Leaderboard público roto si código va antes que SQL | Med | Orden fijo: SQL → código; mismo deploy o slice 1 antes del 2 |
| Dashboard roto si falta `user_stats_owner` al dropear políticas | Med | Crear política de dueño en la MISMA migración SQL |
| CSP PROD rompe sitio por inline no inventariado | Bajo | Inventario verificado (único inline = SW killer); verificación build+preview+grep |
| Hash SW killer obsoleto al editar BaseLayout | Bajo | Comentario en código con instrucciones de recálculo |
| Google OAuth roto si InsForge migra a GSI popup | Bajo | Documentado en spec; reintroducir `accounts.google.com` si ocurre |
| Subqueries admin (`rol='admin'`) afectadas | Bajo | Leen fila propia → OK; smoke test de admin post-migración |

## Rollback Plan

- **SQL**: migración reversible — restaurar las 4 políticas eliminadas (script SQL previo guardado) y `DROP VIEW` de las vistas.
- **Código**: `git revert` del slice; los queries vuelven a `perfiles`/`user_stats` (solo funcionará tras restaurar políticas).
- **CSP**: revertir middleware a la versión anterior (CSP actual queda como DEV fallback).

## Dependencies

- Backend InsForge accesible con apiKey admin para `run-raw-sql` (vía MCP).
- Orden de PRs encadenados garantizado por el orquestador (SQL antes que código).

## Success Criteria

- [ ] Anon y authenticated NO pueden seleccionar `email`/columnas PII de `perfiles` ni `user_stats` (smoke query por rol → error/denied).
- [ ] Leaderboard `/app/comunidad` sigue funcionando sin login (consume vistas).
- [ ] Dashboard `getUserStats` lee su propia fila (policy `user_stats_owner`).
- [ ] `npx vitest run` verde (CSP middleware, ComunidadPage/stats con mock).
- [ ] PROD: header CSP sin `'unsafe-inline'` en script-src ni `accounts.google.com`; sitio OK en preview (sin violaciones en consola).
- [ ] `auditoria_seguridad.md` borrado; tradeoffs documentados en spec.
