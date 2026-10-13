# Feature: insforge-session-proxy — Sesión persistente same-origin

**Estado**: completada (pendiente: redeploy a prod + aceptación del usuario con login real)
**Creada**: 2026-10-12
**Rama**: `main` (sin git por instrucción del usuario — los cambios quedan en disco)

## Objetivo

Que la sesión de usuario sobreviva recargas de página y que desaparezcan los
401 espurios de `/api/auth/refresh` en consola al cargar páginas (ej. Perfil).

## Problema y diagnóstico (verificado empíricamente)

Síntoma del usuario al cargar el perfil:

```
POST http://192.168.50.121:7130/api/auth/refresh → 401 (No refresh token provided)
POST http://192.168.50.121:7130/api/auth/sessions → 401 (INVALID_CREDENTIALS)
```

Causa raíz (probada, no teorizada):

1. InsForge setea la cookie `insforge_refresh_token` con `SameSite=None` **sin
   `Secure`** (curl directo al backend, respuesta 401: flags observados).
2. Chromium **rechaza** `SameSite=None` sin `Secure` en respuestas HTTP
   (experimento con Playwright + servidores locales, Chromium 145):
   - cross-site: rechazada; same-origin: **también rechazada**.
   - `SameSite=Lax` same-origin: **almacenada y enviada** ✓ (incluso en HTTP).
   - `SameSite=None; Secure` en loopback: almacenada (pero inviable en HTTP
     no-loopback, p.ej. prod LAN).
3. Sin esa cookie, TODO refresh es 401 → la sesión muere en cada recarga →
   el gate de `AuthContext` (`insforge_csrf_token`, que el SDK setea por JS y
   sí persiste) dispara `getCurrentUser` → `refreshSession` → 401 en cada carga.

El segundo 401 (`/api/auth/sessions`) es un login con credenciales inválidas
(docs oficiales: 401 = `INVALID_CREDENTIALS`); el LoginPage ya muestra el toast
de error — comportamiento correcto, no requiere fix.

## Solución

1. **Cliente same-origin**: en el navegador el SDK habla con el MISMO origen de
   la app; dev (Vite proxy) y prod (nginx) proxyean `/api/auth`, `/api/storage`
   y `/rest/v1` al backend. En SSR/Node sigue hablando directo (env).
2. **Rewrite de cookie**: `SameSite=None` → `SameSite=Lax` en tránsito
   (dev: hook `proxyRes` del proxy Vite; prod: `proxy_cookie_flags`). Lax
   funciona same-origin en HTTP y HTTPS. Verificado en nginx 1.31.6 real
   (reemplaza el flag, no lo duplica).
3. **Limpieza de rastro**: si restaurar sesión falla con error, borrar la cookie
   `insforge_csrf_token` para no repetir el refresh 401 muerto en cada carga.
4. **Sin cambios de `.env`** (regla del usuario): la URL del cliente se deriva
   en runtime (`window.location.origin`); SSR usa `PUBLIC_INSFORGE_URL`.

## Tareas

- [x] **T1** `src/lib/insforge-url.ts` (nuevo, puro) + `src/lib/insforge-url.test.ts`
      — `resolveInsforgeBaseUrl(envUrl, isBrowser, origin)`; `insforge.ts` lo usa.
      Checks: 4 tests unitarios ✓ (suite total 101).
- [x] **T2** `astro.config.mjs` — `vite.server.proxy` para `/api/auth`,
      `/api/storage` y `/api/database` (el SDK usa `/api/database/records` y
      `/api/database/rpc`, NO `/rest/v1`) con target de `loadEnv(...)` y
      rewrite `SameSite=None→Lax` vía hook `proxyRes`.
      Checks: `curl -X POST :4321/api/auth/refresh` → `Set-Cookie ... SameSite=Lax` ✓;
      `/api/database/records/perfiles` anon → `[]` (RLS) ✓; `/api/stats` intacto ✓.
- [x] **T3** `nginx.conf` — tres `location` (auth con `proxy_cookie_flags`,
      storage con `client_max_body_size 10m`, database).
      Checks: `nginx -t` en nginx:alpine (docker) ✓; semántica del flag probada
      contra nginx 1.31.6 real ✓.
- [x] **T4** `src/lib/auth.ts` + `AuthContext.tsx` — helper
      `clearStaleInsforgeSessionCookie()` + uso cuando el restore falla.
      Checks: 2 tests unitarios ✓; lint 0 errores; tsc paridad 13 (el TS2352
      del cast pre-existente en AuthContext:261 es original, verificado por diff).
- [x] **T5** Verificación integral:
      - E2E Playwright (backend simulado + mini-proxy con la regla exacta):
        login → cookie almacenada (`Lax`, httpOnly) → **sobrevive recarga** →
        refresh 200 ✓.
      - Navegador real, carga anónima de `/perfil`: 0 llamadas a `/api/auth`,
        0 respuestas 4xx/5xx ✓.
      - Suite completa: **101/101** ✓; `tsc --noEmit`: 13 (paridad) ✓; eslint: 0 errores ✓.
      - Aceptación final del usuario: pendiente (login + F5 → sesión viva).

## Descubrimientos (follow-ups, fuera del alcance de esta feature)

- **`invokeRpc` apunta a una ruta inexistente**: `src/lib/insforge.ts:141` usa
  `/rest/v1/rpc/...`; el backend respondió 404 a esa ruta Y a
  `/api/database/rpc/process_workout_completion` con anon (la función existe en
  la DB: `process_workout_completion(req_user_id uuid, duracion_minutos integer)`).
  El SDK usa `/api/database/rpc/{fn}`. Probable bug real en el flujo de
  gamificación (src/lib/gamification.ts:43) — investigar con sesión autenticada.
- **OAuth (Google)**: los redirects van directo al backend (no pasan por el
  proxy); la persistencia de sesión OAuth queda como limitación conocida (no es
  regresión de este cambio).
- **`npm run preview` local** no tiene proxy Vite: el refresh same-origin no
  funciona ahí (solo dev server / prod con nginx).

## Evidencia (anexada)

- Experimento Chromium (cookie flags): rechazo de `None` sin `Secure` (cross y
  same-origin), aceptación de `Lax` first-party en HTTP loopback.
- Experimento nginx 1.31.6 (docker): `proxy_cookie_flags ... samesite=lax`
  reemplaza `SameSite=None` → `SameSite=Lax` (no duplica el atributo).
- curl directo al backend: 401 `No refresh token provided` + `Set-Cookie`
  con `SameSite=None` (sin `Secure`).
- curl vía proxy dev (:4321 y :4399): `Set-Cookie ... SameSite=Lax` ✓.
- E2E Playwright sesión: `A1 200:200 | A2 (recarga) 200:200 | A3 Lax+httpOnly |
  B1 0 llamadas auth | B2 sin 4xx/5xx` ✓.
- Dev server relanzado en background (`npx astro dev --background`, pid 175199,
  :4321) con el proxy activo tras el incidente de caída del server del usuario
  (caída NO relacionada al cambio: una instancia de prueba en :4399 arrancó
  perfecto con la misma config).

## Restricciones y notas

- **Sin git** (instrucción del usuario): sin commits/ramas; la evidencia vive en
  este doc y en Engram.
- nginx.conf acopla la IP del backend (`192.168.50.121:7130`) — igual que ya
  acopla el puerto SSR; si el backend se muda, hay que tocar `.env` Y `nginx.conf`.
- En producción requiere **redeploy** (Dockerfile ya incluye nginx.conf).
- OAuth (Google): los redirects van directo al backend (no pasan por el proxy);
  la persistencia de sesión de OAuth queda como Limitación conocida (igual que
  hoy, no es regresión).
- `npm run preview` local no tiene proxy Vite: el refresh same-origin no
  funciona ahí (solo dev server / prod con nginx). Anotado como limitación.
- Ruta de implementación: **inline** — cambios mecánicos sobre contexto ya
  verificado con experimentos; delegar exigiría transferir todo el diagnóstico.

## Evidencia (se irá anexando)

- Experimento Chromium (cookie flags): rechazo de `None` sin `Secure` (cross y
  same-origin), aceptación de `Lax` first-party en HTTP loopback.
- Experimento nginx 1.31.6 (docker): `proxy_cookie_flags ... samesite=lax`
  reemplaza `SameSite=None` → `SameSite=Lax`.
- curl directo al backend: 401 `No refresh token provided` + `Set-Cookie`
  con `SameSite=None` (sin `Secure`).
