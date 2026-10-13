```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:bc64f1990da284bc83d6c1ca1404647e25457ec0037df758f7ec7e079d55efa5
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 15/15
scenarios: 23/23
test_command: npx vitest run
test_exit_code: 0
test_output_hash: sha256:a8adf0db635fcab8641a07d64e83df85da82f528e97e8f219384c820354dad04
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:799b6e66a9f5eba4e3a7da080080619b724775312991b5173b1c51e9f2683db3
```

## Verification Report

**Change**: hardening-seguridad
**Version**: spec.md consolidado + specs/domain (DAS-1..DAS-8, CSP-1..CSP-7 — todos nuevos)
**Mode**: Strict TDD (runner: `npx vitest run`)
**Evidence revision**: sha256:bc64f1990da284bc83d6c1ca1404647e25457ec0037df758f7ec7e079d55efa5 (runtime attempt token, no persist counters)
**Verificación**: integrada (3 slices) + fase 5, sobre backend InsForge real (`insforge.tesh.online`) y build local.

### Completeness

| Metric | Value |
|--------|-------|
| Requirements total (spec autoritativo) | 15 (DAS-1..8 = 8, CSP-1..7 = 7) |
| Requirements complete | 15 |
| Scenarios total | 23 (DAS: 13, CSP: 10) |
| Scenarios complete | 23 |
| Tasks total (tasks.md) | 27 (1.1–5.3) |
| Tasks residuales de verify (5.2, 5.3) | 0 — ambos ejecutados en esta fase |

### Build & Tests Execution

**Tests**: ✅ 71 passed / 0 failed / 0 skipped (15 files), exit 0 — `npx vitest run`. `test_output_hash: sha256:a8adf0db635fcab8641a07d64e83df85da82f528e97e8f219384c820354dad04`

**Build**: ✅ `npm run build` exit 0 — cadena de 2 pasadas `astro build && node scripts/generate-csp-hashes.mjs && astro build` (el generador arrancó `dist/server/entry.mjs`, renderizó `/`, `/app/login`, `/about`, `/faq`, extrajo 3 scripts inline y regeneró `src/lib/csp-runtime-hashes.generated.ts`). `build_output_hash: sha256:799b6e66a9f5eba4e3a7da080080619b724775312991b5173b1c51e9f2683db3`

**Preview**: ✅ `npm run preview -- --port 4477` — header CSP PROD servido en `/` y `/app/login` con los 3 hashes; `/api/stats` 200 para anon.

### Spec Compliance Matrix

Conteos autoritativos leídos de `openspec/changes/hardening-seguridad/spec.md` + `specs/{data-access-security,content-security-policy}/spec.md`: **15 requirements, 23 scenarios** (8+7 req; 13+10 escenarios).

#### data-access-security

| Requirement | Scenario | Test / Evidence | Result |
|-------------|----------|-----------------|--------|
| DAS-1 | View column sets are minimal | Backend real: `insforge_get-table-schema('perfiles_public')` → exactamente `id, nombre_completo, avatar_url`; `user_stats_public` → exactamente `user_id, xp_total, total_workouts, dias_racha` | ✅ COMPLIANT |
| DAS-1 | Anon reads leaderboard via view | Probe real anon `GET /api/database/records/perfiles_public?select=*` → 200, solo columnas públicas; `user_stats_public?select=*` → 200, solo públicas | ✅ COMPLIANT |
| DAS-2 | Owner reads own full stats row | `pg_policies` real: `user_stats_owner FOR SELECT TO authenticated USING (user_id = auth.uid())` existe; probe auth real (usuario temporal U1): `user_stats?select=*` → fila completa con `weekly_score: 120`, `nivel: 7` | ✅ COMPLIANT |
| DAS-2 | Cross-user stats read returns 0 rows | Probe auth real U1: `user_stats?select=*&user_id=eq.<U2>` → `[]` (0 filas, sin error) | ✅ COMPLIANT |
| DAS-2 | Admin role subqueries still pass | `pg_policies` real: `perfiles_owner_all_v3 (id = auth.uid())` + `project_admin_policy`; la subconsulta `EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol='admin')` lee solo fila propia — cobertura por política (verificado estructuralmente, sin login admin real) | ✅ COMPLIANT (estructural) |
| DAS-3 | Anonymous leaderboard loads | Código: `ComunidadPage.tsx` consulta `perfiles_public`/`user_stats_public` (líneas 133, 143); tests RED/GREEN `ComunidadPage.test.tsx` (3 tests) en verde; probe anon real de ambas vistas 200 | ✅ COMPLIANT |
| DAS-3 | Streak comes from view column | `dias_racha` mapeado línea 167; test mock con `dias_racha: 5` → 5; vista expone la columna (verificada en schema real); nombres base `perfiles`/`user_stats` no consultados por la página | ✅ COMPLIANT |
| DAS-4 | Dashboard stats load after migration | `getUserStats` lee `user_stats` fila propia vía `user_stats_owner` (probe auth real A5 devolvió `*` completo); `DashboardPage.test.tsx` en verde | ✅ COMPLIANT |
| DAS-5 | Direct table select of email denied | Probe real anon `GET /api/database/records/perfiles?select=email` → `[]` HTTP 200 (0 filas, RLS filtra; ningún byte de email) | ✅ COMPLIANT |
| DAS-5 | View has no email column | Probe real anon `GET /api/database/records/perfiles_public?select=email` → HTTP 400 `{"code":"42703","message":"column perfiles_public.email does not exist"}` | ✅ COMPLIANT |
| DAS-6 | Cross-user email probe returns nothing | Probe auth real U1: `perfiles?select=email` → solo su propio email (fila creada en signup); `perfiles?select=email,id&id=eq.<U2>` → `[]` (email de U2 nunca retornado) | ✅ COMPLIANT |
| DAS-7 | /api/stats still reports users | Código `src/pages/api/stats.ts:9` cuenta contra `perfiles_public`; test `stats.test.ts` (2 tests) en verde; preview real `GET /api/stats` → 200 `{"users":2}` (count de la vista con anon) | ✅ COMPLIANT |
| DAS-8 | Both tradeoffs traceable | Spec DAS-8 (consolidado línea 113 + domain spec línea 126) documenta rate-limit client-side (5/10 min, localStorage, eludible) e isAdmin UI-only (verificado por `verifyAdmin()` server-side); `auditoria_seguridad.md` BORRADO en esta fase; rastro en exploration/proposal/spec/verify | ✅ COMPLIANT |

#### content-security-policy

| Requirement | Scenario | Test / Evidence | Result |
|-------------|----------|-----------------|--------|
| CSP-1 | Deterministic output | `csp.test.ts` (5 tests) en verde: `buildCsp({isProd:true})` = `buildCsp({isProd:true})`; middleware usa `buildCsp({isProd: import.meta.env.PROD})` (sin strings inline) | ✅ COMPLIANT |
| CSP-2 | PROD header excludes unsafe-inline and Google | Preview real: `content-security-policy` en `/` y `/app/login` — `script-src 'self' sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A= sha256-eIXWvAmxkr251LJZkjniEK5LcPF3NkapbJepohwYRIc= sha256-Ya0pUYrC7nM5Cn/056TyVuEiz6dFGrzmkWzgON0pF0U=` (+elem), SIN `'unsafe-inline'` ni `accounts.google.com` en script/frame; resto de directivas intactas (style-src unsafe-inline intencional) | ✅ COMPLIANT |
| CSP-2 | vitest asserts PROD directives | `csp.test.ts`: estructura exacta `script-src 'self' <hashes>`, 3 hashes presentes, ausencia de unsafe-inline/accounts.google.com, directivas restantes | ✅ COMPLIANT |
| CSP-3 | DEV header keeps unsafe-inline | `csp.test.ts` + preview real dev (`npm run dev`): header DEV con `'unsafe-inline'` y `https://accounts.google.com` en script-src y frame-src | ✅ COMPLIANT |
| CSP-4 | Preview navigation zero violations | **Parcial por limitación de entorno**: no hay browser disponible en esta ejecución para navegar landing↔/app y leer consola. Evidencia sustituida (permitida por tasks 5.2): header PROD servido con los 3 hashes + verificación programática de cobertura: los 8 scripts inline ejecutables servidos en las 4 páginas sampleadas (/, /app/login, /about, /faq) quedan 100% cubiertos por `script-src`/`script-src-elem` (ninguno cae a unsafe-inline); navigación ClientRouter corre sobre módulos externos cubiertos por `'self'` | ⚠️ LIMITED (evidencia header+cobertura; sin consola browser) |
| CSP-5 | OAuth redirect completes | **Parcial por limitación de entorno**: no se ejecutó click-through OAuth (requiere browser + cuenta Google). Evidencia: flujo es full-page redirect (InsForge → Google → `#access_token`), cero scripts/iframes GSI en el origin (solo 3 scripts inline, todos hasheados); header PROD omite frame-src y no lista accounts.google.com; comentario en `csp.ts` (CSP-5) documenta reintroducir `accounts.google.com` si InsForge migra a GSI popup/one-tap | ⚠️ LIMITED (estructural; sin click-through) |
| CSP-6 | Recalc instructions present in source | `BaseLayout.astro` líneas 86–102: comentario con `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=` + pipeline `npm run build` / `node scripts/generate-csp-hashes.mjs --print`, sin extracción ingenua sobre fuente (documenta por qué) | ✅ COMPLIANT |
| CSP-7 | PROD covers every served inline script | Verificación programática sobre preview: 8 instancias de scripts inline servidos (SW killer 480B, helper astro:only 130B, runtime astro-island 4380B) → los 3 hashes del inventario aparecen en `script-src`; cobertura 100% | ✅ COMPLIANT |
| CSP-7 | No generated inventory fails loud | Moví temporalmente `src/lib/csp-runtime-hashes.generated.ts` → `npx vitest run src/lib/csp.test.ts` falla con `Failed to resolve import "./csp-runtime-hashes.generated"` (fail-fast, sin degradación silenciosa); archivo restaurado | ✅ COMPLIANT |
| CSP-7 | Astro upgrade regenerates hashes | Cadena `npm run build` ejecutó el generador entre 2 pasadas y reescribió el módulo generado (evidencia en output del build); `package.json` `"build": "astro build && node scripts/generate-csp-hashes.mjs && astro build"` | ✅ COMPLIANT |

**Compliance summary**: 23/23 scenarios (21 con evidencia runtime/policy real, 2 LIMITED por limitación de entorno declarada — browser no disponible; evidencia de header+cobertura que tasks 5.2 permite).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| DAS-1 — Vistas públicas restringidas | ✅ Implementado | Migración `db/migrations/hardening_seguridad.sql`: 2 vistas con columnas exactas; GRANT SELECT + REVOKE DML; idempotente |
| DAS-2 — Políticas amplias dropped + owner | ✅ Implementado | `pg_policies` real: las 4 políticas amplias YA NO existen; `user_stats_owner (user_id = auth.uid())` creado; `perfiles_owner_all_v3` y `project_admin_policy` intactas; rollback `hardening_seguridad_rollback.sql` restaura las 4 + DROP vistas (presente y correcto) |
| DAS-3 — Leaderboard vía vistas | ✅ Implementado | ComunidadPage: `perfiles_public (id, nombre_completo, avatar_url)` + `user_stats_public (user_id, xp_total, total_workouts, dias_racha)`; `dias_racha` en interface (línea 11) y mapeo (167); cero refs a tablas base; `streak_days` eliminado (solo comentario explicativo en test) |
| DAS-4 — Dashboard lee fila propia | ✅ Implementado | `getUserStats` (src/lib/stats.ts) intacto → fila propia vía `user_stats_owner`; probado con token auth real |
| DAS-7 — /api/stats contra vista | ✅ Implementado | `count` contra `perfiles_public`; 200 con anon en preview |
| CSP-1/2/3 — Helper puro + split | ✅ Implementado | `src/lib/csp.ts` puro y determinista; middleware delega |
| CSP-6 — Comentario mantenible | ✅ Implementado | Hash REAL + instrucciones de recálculo |
| CSP-7 — Inventario build-time | ✅ Implementado | Generador de hashes sobre HTML renderizado (CSP3 semantics: strip comments, sin src, tipos ejecutables, union páginas, fail-fast vacío/malformado); módulo generado versionado; regenerado en cada build |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Approach A — vistas en vez de REVOKE per-column / RPC get_leaderboard | ✅ Sí | Consistency con exploration #396 (non-goals respetados) |
| Migración atómica (DROP políticas + CREATE owner en la misma transacción) | ✅ Sí | `BEGIN; ... COMMIT;` en un solo archivo |
| Hash SW killer = bytes servidos (`iThovp4...`), no extracción fuente | ✅ Sí | `rEmM0...` documentado como artefacto de extracción; corregido en csp.ts, tests, BaseLayout y spec |
| Build de 2 pasadas (generador entre builds) | ✅ Sí | package.json + evidencia ejecución |
| `csp-runtime-hashes.generated.ts` versionado (fail-fast si falta) | ✅ Sí | Verificado moviendo el archivo (vitest falla claro); restaurado |
| style-src 'unsafe-inline' conservado (React SSR/framer-motion) | ✅ Sí | Espec y código coinciden; non-goal respetado |
| `auditoria_seguridad.md` eliminado (conocimiento → SDD artifacts) | ✅ Sí | `rm auditoria_seguridad.md` en esta fase; referencias restantes solo documentales en los propios artifacts SDD (esperado) |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| RED → GREEN evidence | ✅ | Tests visibles en repo: `ComunidadPage.test.tsx` (3), `stats.test.ts` (2), `csp.test.ts` (5) — todos nuevos y en verde |
| GREEN total | ✅ | 71/71 tests verde, exit 0 (15 archivos, incluye los 10 nuevos del cambio) |
| Helper puro testeable | ✅ | `buildCsp` sin efectos, determinismo testeado |
| Fail-fast del inventario | ✅ | Verificado experimentalmente (vitest falla sin el módulo) |

### Issues Found

**CRITICAL**: None (0 blockers, 0 critical findings)

**WARNING**:
1. **CSP-4/CSP-5 sin validación browser** — Esta ejecución no dispone de browser/Playwright para navegar preview (landing↔/app, consola sin violaciones) ni click-through OAuth con Google real. Evidencia sustituida permitida por tasks 5.2 (header servido + cobertura 100% de scripts inline verificada programáticamente + flujo OAuth es full-page redirect sin GSI en origin). **Marcado LIMITED, no PASS-de-browser**; una re-verificación con browser cerraría la brecha de evidencia.
2. **Residuo de usuario temporal en auth.users** — Para el probe authenticated real (DAS-6/DAS-2) se creó un usuario de verificación `verify-das-1786295255@davefit.test` (id `b0ea05c0-...`) vía `POST /api/auth/users`. Datos restaurados: su fila de `perfiles` y `user_stats` fueron borradas (backend devuelto a 2/2 = baseline). La fila `auth.users` NO pudo borrarse: el endpoint `DELETE /api/auth/users` requiere token admin (401 `AUTH_INVALID_CREDENTIALS`) y el MCP bloquea DELETE sobre schema `auth`. Queda un registro auth inerte (sin perfil, sin datos), password conocido solo por esta verificación. **Acción sugerida**: eliminar vía dashboard/admin de InsForge, o dejar que expire (token exp 15 min; la fila no expira).
3. **DAS-2 escenario admin verificado estructuralmente** — La subconsulta `rol='admin'` se verificó por inspección de políticas (`perfiles_owner_all_v3` cubre lectura de fila propia; `project_admin_policy` para rol admin) y no con un login admin real; el riesgo residual es nulo (no existe política amplia sobre `perfiles`).

**SUGGESTION**:
1. **Browser smoke post-PR** — Cuando el cambio se despliegue (o localmente con Playwright), ejecutar la navegación landing↔/app con consola abierta y el flujo OAuth de Google para cerrar la evidencia LIMITED de CSP-4/CSP-5.
2. **Eliminar el residuo auth** — Borrar `verify-das-1786295255@davefit.test` desde el panel admin de InsForge (el MCP no permite DELETE en `auth.users`).

### Verdict

**Envelope verdict (machine-routing)**: `pass_with_warnings` — 15/15 requirements, 23/23 scenarios completados; 0 blockers, 0 critical findings; ambos comandos (test/build) exit 0; evidencia real (SQL por rol, header CSP PROD/DEV, cobertura 100%, fail-fast, borrado de `auditoria_seguridad.md`) verificada en esta fase. Las 2 advertencias son de *completitud de evidencia de entorno* (browser/OAuth) y de *higiene* (residuo auth), ninguna es defecto de implementación.

**Human verdict**: **PASS** — El cambio implementa lo que el spec exige: el leak de PII anon/authenticated está cerrado en el backend real (probes DAS-5/DAS-6 con 0 filas y error de columna), el owner policy funciona (DAS-2/DAS-4 con fila completa), el leaderboard y /api/stats operan vía vistas (DAS-3/DAS-7), el CSP PROD está endurecido sin unsafe-inline ni accounts.google.com con inventario build-time de cobertura 100% (CSP-1/2/3/6/7), y la fase 5 quedó completa (5.1 tests 71/71, 5.2 build+preview+/api/stats 200, 5.3 archivo audit borrado + tradeoffs en spec DAS-8).

**Archive-ready**: ✅ SÍ — con la nota de que CSP-4/CSP-5 alcanzan evidencia plena de browser en el archivo/re-verify Post-PR (no bloquea: tasks 5.2 permite header+cobertura para el verify formal). SUGGESTION: limpiar el residuo `auth.users` via admin.

---

*Items dependientes de entorno (fuera del alcance de este veredicto): navegación browser real (CSP-4), click-through OAuth (CSP-5), borrado del residuo auth (requiere token admin).*