# IA Coach MVP — Página /coach + endpoint seguro (producción)

Objetivo: MVP del Coach IA con página dedicada `/coach`, endpoint `/api/coach` con sesión obligatoria, cuota de 10 mensajes/5 h, contexto real del usuario (3 últimas rutinas + objetivo + métricas) y modelo `openai/gpt-6-luna` vía gateway InsForge.
Branch: `main` — **sin commits ni push** (restricción explícita del usuario, ver L1). Entrega: construcción directa e iterativa (ODD).
Runners: `npx vitest run` (unit) · `npx playwright test --project chromium` (E2E) · `playwright-cli` (validación visual).

## Specs

S1. Reglas de entorno: ODD directa e iterativa; DB de PRODUCCIÓN exclusiva; prohibido `git commit`/`git push`; validación visual con `playwright-cli`; Judgment Day/verify al completar frontend y backend.
S2. Endpoint seguro `/api/coach`: exige sesión de usuario activa; estrictamente prohibido llamar al gateway de IA directamente desde el frontend con la anon key.
S3. Cuota por usuario: 10 mensajes; contador con restablecimiento automático a las 5 horas; el mensaje número 11 se bloquea con advertencia amigable en la UI.
S4. Motor de IA: enrutar a `openai/gpt-6-luna` a través del gateway de InsForge (verificado HTTP 200 contra prod durante la exploración; el id sin prefijo `gpt-6-luna` NO está habilitado → 500).
S5. Inyección de contexto automática desde la DB antes de enviar la pregunta; debe incluir estrictamente: (1) las 3 últimas rutinas realizadas, (2) el objetivo principal, (3) un resumen compacto de métricas generales.
S6. Página completa dedicada `/coach` (descartado el widget flotante), heredando layout y sistema de diseño existentes; acceso integrado en el menú de navegación principal.
S7. Criterios de aceptación: (1) página integrada validada con Playwright; (2) chat vía endpoint seguro; (3) bloqueo del mensaje 11 con aviso amigable; (4) respuestas evidencian rutinas/métricas/objetivos del usuario en sesión; (5) Judgment Day en verde, plataforma y storage intactos.

## Tasks

| ID | Descripción | Specs | Ruta | Estado | Evidencia |
|----|-------------|-------|------|--------|-----------|
| T1 | DB prod: tabla `coach_usage` + RPCs `coach_consumir_mensaje` / `coach_estado` (SECURITY DEFINER, `auth.uid()`, grants solo `authenticated`); migración espejo en `db/migrations/coach_mvp.sql` + rollback | S3 | inline | ✅ | ACLs `{postgres,authenticated}`; anon HTTP → 401; RLS activa; smoke: uso N → `allowed=true`, N° 11 → `allowed=false` |
| T2 | Backend: `src/lib/coach.ts` (helpers puros, test-first) + `src/pages/api/coach.ts` (GET estado / POST mensaje: token de sesión, cuota, contexto, gpt-6-luna, 401/429/502) | S2 S3 S4 S5 | inline | ✅ | RED→GREEN (12 tests); curl: 403 sin CSRF, 401 sin token, 200 con reply real, 429 en N° 11; el reply cita las 3 rutinas + objetivo (`openai/gpt-6-luna`) |
| T3 | Frontend: `src/app/pages/CoachPage.tsx` + ruta `/coach` en `App.tsx` + link en `navLinks.ts` | S6 | inline | ✅ | RED→GREEN (4 tests); eslint 0 errores; build de producción OK |
| T4 | E2E: usuario de prueba sembrado en prod + `e2e/coach.spec.ts` (chromium) + validación visual `playwright-cli` + verificación de cuota (RPC 10 ok / 11 bloqueado) | S1 S3 S7 | inline | ✅ | Playwright real 2/2 (post-fix, 20 s); `playwright-cli`: render + chat interactivo + screenshot (cuota 10/10 → 9/10); N° 11 → 429 + advertencia UI + input deshabilitado |
| T5 | Judgment Day (jd-judge-a/b) + suite completa (vitest, build, eslint) + smoke plataforma/storage | S7 | delegado | ✅ | R1: A limpio / B 1 CRITICAL + 5 WARN → CRITICAL (bypass de cuota) reproducido y corregido en ronda 1 → R2 escopada: **ambos jueces limpios → APPROVED ✅**; vitest 147/147; build OK; specs existentes 3/3; storage sin cambios |

## Log

L1 (2026-10-13) — Pedido del usuario (verbatim):

> hoy vamos hacer artos amigo : # ODD Spec: MVP IA Coach (Página Dedicada y Backend Seguro)
>
> ## 1. Reglas Estrictas de Entorno (Globales)
> - **Metodología:** Organic-Driven Development (ODD). Construye este MVP de forma directa e iterativa.
> - **Base de Datos:** Conexión y consultas EXCLUSIVAS a la base de datos de PRODUCCIÓN.
> - **Control de Versiones:** Prohibido realizar git commit o git push.
> - **Validación Visual:** Utiliza `playwright-cli` obligatoriamente para verificar que la nueva ruta y la interfaz se renderizan correctamente.
> - **Validación de Integridad:** Ejecuta tu proceso interno de verificación ("Judgment Day" / verify) tras completar el frontend y backend para asegurar que la app no sufre regresiones.
>
> ## 2. Arquitectura de Seguridad y Backend (Prioridad 1)
> - **Endpoint Protegido:** Crea un endpoint seguro en el servidor (ej. `/api/coach`) que exija una sesión de usuario activa. Está estrictamente prohibido llamar al gateway de IA directamente desde el frontend con la anon key.
> - **Control de Cuotas (Rate Limiting):** Implementa una restricción por usuario de **10 mensajes**. Este contador debe restablecerse automáticamente tras **5 horas**.
> - **Motor de IA:** Configura el endpoint para enrutar las peticiones al modelo **`gpt-6-luna`** a través del gateway de InsForge.
>
> ## 3. Inyección de Contexto del Usuario
> - Para garantizar respuestas rápidas y consumir menos tokens, el endpoint debe consultar la base de datos y armar un contexto resumido de forma automática antes de enviar la pregunta del usuario a `gpt-6-luna`.
> - El contexto (inyectado en el system prompt o mensaje inicial invisible) debe incluir estrictamente:
>   1. Las 3 últimas rutinas realizadas por el usuario.
>   2. Su objetivo principal.
>   3. Un resumen compacto de sus métricas generales.
>
> ## 4. Interfaz de Usuario (Frontend)
> - **Página Completa:** Desarrolla una ruta y página dedicada (ej. `/coach`). Descarta la idea del widget flotante.
> - **UI/UX Consistente:** La nueva página debe heredar la misma estructura, layout y sistema de diseño que el resto de las secciones actuales de la plataforma.
> - **Navegación:** Integra el acceso a esta nueva página en el menú de navegación principal.
>
> ## 5. Criterios de Aceptación
> 1. Navegar a la sección del IA Coach muestra una página completa integrada en el diseño global, validado mediante Playwright.
> 2. El chat funciona enviando los mensajes a través del nuevo endpoint seguro.
> 3. El sistema bloquea el envío del mensaje número 11 (hasta que pasen 5 horas) y muestra una advertencia amigable en la UI.
> 4. Las respuestas del modelo evidencian que conoce las rutinas, métricas y objetivos del usuario en sesión.
> 5. El "Día del Juicio" finaliza en verde, garantizando que el resto de la plataforma y el storage siguen intactos.

L2 (2026-10-13) — Exploración (evidencia):
- Sesión del frontend: el access token vive en el `tokenManager` del SDK (no hay cookie JS-readable). Patrón del proyecto: el cliente manda `Authorization: Bearer <token>` (igual que `invokeRpc` en `src/lib/insforge.ts`); el backend valida de verdad. El endpoint usará ESE token para RPC + lecturas (RLS aplica con rol `authenticated`).
- CSRF: `src/middleware.ts` exige double-submit (`X-XSRF-TOKEN` ↔ cookie `xsrf-token`/`__Host-xsrf-token`) para POST en `/api/*` → la página usará `getCsrfHeader()`.
- Rutas API existentes: `src/pages/api/stats.ts`, `src/pages/api/suggestions.ts` (patrón de Response JSON + guardas de tamaño/errores).
- DB prod (MCP): `historial_entrenamientos` (5 filas) es la fuente de "rutinas realizadas" (`WorkoutPracticePage` inserta ahí; `stats.getWeeklyWorkoutCount` lee de ahí). `user_stats` = métricas (xp_total, nivel, dias_racha, total_workouts…). `perfiles.objetivo` = objetivo principal. `workout_completions` está vacía (legacy).
- Gateway IA: `POST /api/ai/chat/completion` con anon key; `openai/gpt-6-luna` → HTTP 200 `{"text":"OK"}`; `gpt-6-luna` → HTTP 500 "not enabled".
- Proxy dev: `/api/auth`, `/api/storage`, `/api/database`, `/api/ai` (astro.config.mjs) → `/api/coach` NO se proxya: cae en el SSR de Astro ✅.
- Nav: fuente única `src/app/lib/navLinks.ts` (`public: false` = solo logueados, desktop + mobile).
- Patrón RPC seguro previo (migraciones `hardening_workout_rpc_*`): SECURITY DEFINER + `SET search_path = public` + guard `auth.uid()` + `REVOKE … FROM PUBLIC, anon` + `GRANT … TO authenticated` + `NOTIFY pgrst, 'reload schema'`.

L3 (2026-10-13) — Decisiones de diseño (ODD):
- Cuota = ventana fija por usuario: el contador arranca con el primer mensaje y se resetea a las 5 h (interpretación literal de "se restablece automáticamente tras 5 horas"). Implementada con upsert atómico en RPC (`ON CONFLICT … CASE window_start <= now() - interval '5 hours'`), race-safe.
- El mensaje N° 11 se bloquea ANTES de llamar a la IA (no consume tokens) y devuelve `429` con `reset_at` para la UI.
- Si el gateway falla después de consumir cuota, el endpoint reembolsa (RPC `coach_reembolsar_mensaje`, best-effort). → **REVERTIDO en L4** (el reembolso resultó evadible).
- Sin persistencia de conversaciones en MVP: el cliente manda historial acotado (máx 6 mensajes) y el endpoint lo sanitiza.
- Migración aplicada a prod vía MCP y espejada en `db/migrations/coach_mvp.sql` (patrón del proyecto). Sin commit (L1).

L4 (2026-10-13) — Judgment Day ronda 1 (target congelado sha256 `81d5fc2c…`; jueces ciegos A/B con skills: astro-framework, vercel-react-best-practices, supabase-postgres-best-practices):
- Juez A: `{"findings":[]}` — limpio. Juez B: 1 CRITICAL + 5 WARNING.
- CRITICAL (B): `coach_reembolsar_mensaje` era llamable por cualquier usuario autenticado vía `/api/database/rpc/…` → decremento propio del contador → cuota evadible (el propio E2E usaba ese camino como "reset"). **Reproducido por el orquestador** (estado used 2 → refund → used 1). Desviación consciente y documentada de la regla "solo corrige hallazgos confirmados por ambos jueces": el hallazgo es determinísticamente verificable y viola el criterio de aceptación 3 / S3.
- Fix ronda 1: se ELIMINÓ el RPC de reembolso (`DROP` aplicado en prod + migración espejo y rollback actualizados) y sus 3 llamadas en el endpoint. El consumo previo a la IA se mantiene → el bloqueo del mensaje N° 11 es determinista; si el gateway falla tras el consumo, el mensaje se pierde (fallo raro; la cuota se renueva sola a las 5 h). E2E actualizado: sin soft-reset por reembolso; el reset es precondición externa documentada y el test afirma descuento relativo (antes − 1).
- WARNINGs de B registrados como `info` (no se corrigieron, por regla del Judgment Day) — follow-ups: (1) nginx `proxy_read_timeout` 60s vs `AI_TIMEOUT_MS` 60s (presupuestos en carrera); (2) `MAX_BODY_BYTES` 10 KB vs peor caso ~14 KB de historial (6×2000 + 2000) → 413 en conversaciones largas; (3) sin timeout/AbortSignal en los fetch internos (RPC/records); (4) brecha de cobertura de tests para los flujos 502/401 de CoachPage; (5) el regex del E2E depende de output libre del modelo.

L5 (2026-10-13) — Re-judgment escopado + verificación final (cierre):
- Re-judgment ronda 1 (ledger congelado + fix delta, target hash `36587310…`, mismos jueces y skills): juez A limpio; juez B (autor del CRITICAL) limpio — *"the quota bypass (F1) is deterministically closed … no new incorrect behavior"*. **TERMINAL: APPROVED ✅**.
- Verificación funcional post-fix: bypass cerrado (RPC → HTTP 404 PGRST202); endpoint operativo (200 + reply real, cuota 10→9); e2e real 2/2 (transcripción: las 3 rutinas + "ganar fuerza"); `playwright-cli` interactivo OK (render + chat + screenshot en `odd/evidence/ia-coach-mvp/`); vitest **147/147**; build de producción OK; eslint **0 errores**; specs existentes home/dashboard **3/3** (cero requests al backend real); storage intacto (avatares 3 / ejercicios 3, sin cambios); **git SIN commits** (HEAD sigue en `75f0876`, regla L1).
- Cuenta de prueba `e2e-coach@davefit.local` queda activa con datos sembrados (para demo/re-run del spec); su cuota fue reseteada (fila `coach_usage` eliminada). Para probar manualmente: login en la app → `/coach` (el Coach funciona con cualquier usuario autenticado; el owner real ya tiene historial en la DB).
