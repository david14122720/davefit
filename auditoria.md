# Auditoría de Seguridad — DaveFit

**Fecha**: 2026-10-18
**Alcance**: árbol de trabajo actual (incluye cambios de la feature cliente-pesado sin commitear). Código, configuración nginx/Docker, migraciones SQL del repo, endpoints `/api/*`, SDK InsForge y superficie expuesta.
**Metodología**: auditoría source-first con 3 hunters ciegos en paralelo (auth/RBAC, inyección/DB/uploads, client-side/infra) + validación individual de cada hallazgo por el orquestador (cada afirmación re-verificada con `path:line` en código). Read-only: no se consultó ni mutó la DB de producción. Sin corridas previas de auditoría → cobertura parcial; recomiendo repetir el ejercicio para aumentar cobertura.

## Resumen ejecutivo

| # | Hallazgo | Severidad | Explotable hoy |
|---|----------|-----------|----------------|
| F1 | Credenciales de usuario de producción commiteadas en tests e2e | MEDIA | ✅ Sí |
| F2 | Credenciales de admin en script obsoleto commiteado | MEDIA | ⚠️ Condicional |
| F3 | Gateway IA alcanzable sin cuota con la anon key (via `/api/ai/`) | MEDIA | ✅ Sí |
| F4 | Bypass de validación/rate-limit de sugerencias vía PostgREST directo | MEDIA | ✅ Sí |
| F5 | Refresh token sin `Secure` + despliegue HTTP plano | MEDIA | ⚠️ Condicional (on-path LAN) |
| F6 | `.env.production` commiteada (IP interna expuesta) | BAJA | ✅ Sí |

Ningún hallazgo CRITICAL. No hay RCE, no hay fuga de PII de otros usuarios, no hay XSS almacenado. Los riesgos de mayor impacto son credenciales en el repo y abuso del gateway IA.

---

## Hallazgos

### F1 — Credenciales de usuario de producción commiteadas (MEDIA, explotable hoy)

**Dónde**: `e2e/coach.spec.ts:36-37` (y referencias en `odd/evidence/ia-coach-mvp/coach-transcript.txt`)

**Evidencia**: el repo contiene usuario y contraseña en claro de una cuenta **sembrada en producción** (`e2e-coach@davefit.local` / `Coach!E2E2026`, comentario en línea 18: «sembrado en prod»). El transcript commiteado demuestra con una sesión real que la cuenta existe y funciona contra el backend al que nginx y el proxy de dev resuelven.

**Escenario**: cualquier lector del repo (origin en GitHub) inicia sesión en `/login`, se hace pasar por la cuenta e2e, escribe en su historial, consume su cuota de Coach (cuesta tokens reales del proyecto) y degrada/pollute leaderboards públicos bajo esa identidad.

**Recomendación**: rotar la contraseña HOY, no sembrar cuentas reales en prod para e2e (usar usuario efímero creado en runtime por el propio test y eliminado al final), y reescribir el historial de git si el repo es público. Extraer credenciales a variables de entorno inyectadas por CI.

### F2 — Credenciales de admin en script obsoleto commiteado (MEDIA, condicional)

**Dónde**: `scripts/create-admin.ts:4,9-10`

**Evidencia**: `admin@davefit.com` / `Admin123!` en claro, apuntando a `insforge.tesh.online` (backend anterior, hoy fuera de la topología: prod es `192.168.50.121:7130`). El archivo está trackeado (`git ls-files`).

**Escenario**: si esas credenciales fueron reusadas o la cuenta existe en el backend actual, el atacante会是 admin: CRUD completo desde `/api/admin/*` (verificado server-side con JWT + rol) y panel admin. Condicional al estado real de la cuenta.

**Recomendación**: eliminar el script (obsoleto: Worker ya no se crea así) y rotar la contraseña de admin si coincide. Reglas repo-wide: niveles secretos solo por env/CI.

### F3 — Gateway IA sin cuota con la anon key (MEDIA, explotable hoy)

**Dónde**: `src/pages/api/coach.ts:248` (cuota aplicada solo en el endpoint), `nginx.conf:49-51` (proxy `/api/ai/` al backend), `odd/tasks/ia-coach-mvp.md:10,12` (spec S2 prohibe llamar directo; S4 confirma gateway respondió 200 con anon key).

**Evidencia**: la cuota de 10 mensajes/5h se consume vía RPC `coach_consumir_mensaje` **antes** de llamar al gateway con la anon key del servidor. El gateway acepta esa anon key (la spec S2 lo confirma implícitamente al prohibir el uso directo). nginx expone el prefijo `/api/ai/` same-origin.

**Escenario**: un visitante anónimo lee la anon key del bundle público y hace POST directo a `/api/ai/chat/completion` saltándose Astro y su cuota. LLM sin límite facturado al proyecto. Nota: el bypass anterior (RPC de reembolso) fue corregido el 2026-10-13; este es el vector restante.

**Recomendación**: restringir `/api/ai/` en nginx (o exigir en el gateway un token de servicio distinto de la anon key, server-to-server). Alternativa mínima: `auth_request` hacia Astro server (valida sesión) + luego proxy.

### F4 — Bypass de validación/rate-limit de sugerencias vía PostgREST directo (MEDIA)

**Dónde**: `db/migrations/fix_suggestions_insert_policy.sql:20-21` (`WITH CHECK (true)`), `nginx.conf:42-44` (proxy `/api/database/`), `src/pages/api/suggestions.ts:6-12,75-135` (sanitización + rate limit solo en el endpoint).

**Evidencia**: la migración relajó el policy público de INSERT a `true` (antes exigía `is_approved=false`). Con la anon key pública y el prefijo `/api/database/` proxado, un anónimo puede insertar directo sin pasar por el endpoint: sin sanitización ni límite 1/min/IP, con `rating` y `message` arbitrarios (int4 admite hasta 2147483647 — infla el rating promedio que expone `/api/stats`).

**Escenario**: spam al muro de sugerencias (`/comunidad`, /acerca-de) y manipulación de métricas públicas hasta que un admin las borre. Render React escapa el texto → no es XSS, es integridad/appearance.

**Recomendación**: revertir el `WITH CHECK(true)` a la validación original (o policy que solo permita `is_approved=false` + clamp de rating (`CHECK (rating BETWEEN 1 AND 5))`) y añadir un rate limit en DB (p. ej. truncar por IP con una función SECURITY DEFINER). Decisión consciente del tradeoff si se deja así.

### F5 — Refresh token sin `Secure` sobre despliegue HTTP plano (MEDIA, condicional)

**Dónde**: `nginx.conf:2` (`listen 80`, sin TLS), `nginx.conf:38` (`proxy_cookie_flags insforge_refresh_token samesite=lax` sin `secure`), `astro.config.mjs:15-19` (mismo patrón en dev).

**Escenario**: atacante en la misma red (campus/co-work) captura en claro la respuesta de `/api/auth/refresh` y roba el refresh cookie (HttpOnly pero sin Secure), mintiendo access tokens para impersonar a la víctima. Condicional a HTTP; si algún día hay TLS, dejar de ser válido.

**Recomendación**: terminar TLS (en Dokploy o nginx con cert LE local) y añadir `secure` a `proxy_cookie_flags`. HSTS ya está en las respuestas del middleware.

### F6 — `.env.production` commiteada (BAJA)

**Dónde**: `git ls-files` la trackea (a pesar de `.gitignore`); contiene solo la anon key pública (por diseño) y la IP interna `192.168.50.121`.

**Impacto**: divulgación de topología interna; sin clave de servicio expuesta. Informativa.

**Recomendación**: `git rm --cached .env.production` + regla en pre-commit contra envs trackeadas.

---

## Notas de hardening (no son hallazgos)

- **Headers en estáticos**: nginx sirve `/_astro/*` y públicos **directo**, sin pasar por el middleware Astro → sin CSP/nosniff/XFO. Son artifacts, no documentos, sin downgrade concreto; opcional: `add_header X-Content-Type-Options nosniff always` a nivel server.
- **RLS de escritura admin**: las políticas INSERT/UPDATE/DELETE de `ejercicios`/`rutinas`/`yoga_*` no están visibles en repo (el gate real es server-side en `/api/admin/*`). Recomendo sondeo `pg_policies` en prod para confirm que un `authenticated` común no puede escribir contenido directamente.
- **Duración autoreporteada**: usuarios autenticados pueden reportar `duracion_minutos` arbitrario en su propio historial (infla propio XP/leaderboard; cross-user cerrado por RLS). Tradeoff por diseño.
- El CSRF del middleware nunca ve los prefijos proxeados por nginx (`/api/auth|database|ai|storage`); sus mutaciones se autentican con Bearer en memoria + SameSite=Lax — arquitectura válida, documentarla.

## Fortalezas verificadas

- Administración con doble control server-side (JWT verificado + rol re-leído de `perfiles`): el `isAdmin` del cliente solo oculta UI.
- Cierre efectivo del leak de PII: vistas `perfiles_public`/`user_stats_public` + trigger `protect_roles` que bloquea autoescalado de rol.
- CSRF double-submit sano: token con `crypto.getRandomValues`, cookie `__Host-xsrf-token` (Secure, SameSite=Strict), header custom que exige preflight CORS que la app nunca concede.
- Único sink de HTML crudo = Coach con DOMPurify (sin atributos, sin `<a>`); el resto rendering React puro. Sin eval/`new Function`/concat de innerHTML en src.
- Cross-user XP cerrado: wrapper `req_user_id = auth.uid()` y grants solo `authenticated`.
- Sin sourcemaps en prod, no service keys en el tree, sin autoindex ni dotfiles en nginx.

## Áreas revisadas sin hallazgos

OAuth Google, TokenManager in-memory (sin JWT en localStorage), IAM del storage via API directa (requiere prueba en despliegue para SVG/HTML inline — no confirmado desde código), SSRF (fetches server-side a endpoints fijos), encoding de filtros PostgREST (SDK URL-encodes valores; columnas siempre literales), compras/monetización (no existe aún), `generate-csp-hashes`/`compress-assets` (solo escriben dentro de dist).

## Limitaciones

- Auditoría estática + evidencia interna del repo; la DB de producción no se consultó durante el hunting (read-only), pero sí durante la fase de remediación autorizada por el usuario (2026-10-18, ver sección siguiente).
- Un solo run de auditoría cubre ~mitad de las vulns al que llega una batería multi-run; conviene repetir en otra corrida.
- Hallazgos condicionales (F2, F5) requieren confirmación en despliegue real.

---

## Remediación (2026-10-18, autorizada por el usuario)

| Hallazgo | Estado | Evidencia |
|----------|--------|-----------|
| F1 | ✅ RESUELTA | Contraseña de la cuenta e2e rotada en prod: credencial comprometida ahora → `401` en `/api/auth/sessions`, nueva → `200`. La contraseña nueva vive solo en `.env` (gitignored). `e2e/coach.spec.ts` ya no contiene credenciales: lee `E2E_COACH_EMAIL`/`E2E_COACH_PASSWORD` (env o `.env`) y hace `test.skip` si faltan. Cuenta aún sembrada en prod con datos de prueba; cuenta efímera por-test queda como mejora futura. |
| F2 | ✅ RESUELTA | `scripts/create-admin.ts` eliminado. La credencial se verificó MUERTA contra el backend actual (`401` en `/api/auth/sessions` y la cuenta `admin@davefit.com` no existe en `auth.users`) → sin rotación pendiente. |
| F3 | ✅ RESUELTA en repo | `nginx.conf`: `location /api/ai/` ahora `return 404`. Único consumo legítimo es server-side directo (`src/pages/api/coach.ts:286`), spec S2 prohibe el uso frontend. Validado `nginx -t` en contenedor. **Llega a prod en el próximo deploy** — hasta entonces el vector sigue abierto ahí. |
| F4 | ✅ RESUELTA en prod | Aplicado a la DB viva: CHECK de columna `rating BETWEEN 0 AND 5` + policy INSERT `"Insercion publica sugerencias"` con `COALESCE(is_approved, true) = true AND rating BETWEEN 0 AND 5 AND char_length(btrim(message)) BETWEEN 1 AND 2000`. Prueba conductual con la anon key como atacante: insert de 2501 chars/rating 9 → bloqueado (`42501`); insert estilo-app → `201` y fila de prueba borrada. Migración espejo: `db/migrations/fix_suggestions_insert_policy_hardening.sql` (idempotente). **Ventana residual declarada**: spam por volumen sin rate-limit a nivel DB (según diseño actual sin UI de aprobación); al 18/10 son 3 filas, riesgo bajo. |
| F5 | ⏳ PENDIENTE (decisión) | Requiere terminar TLS en el despliegue (Dokploy o cert local). Añadir `secure` a la cookie sin TLS previo rompería el login. Decisión de infra a discutir con el usuario. |
| F6 | ✅ RESUELTA | `git rm --cached .env.production` (el archivo sigue en disco local; `.gitignore` lo cubre). Verificado que el build de Dokploy NO lo necesita: los `ARG PUBLIC_*` con defaults ya están commiteados en el `Dockerfile` (HEAD líneas 6-7); el estado "sin commitear" del logbook de cierre-pendientes-main quedó obsoleto. |
