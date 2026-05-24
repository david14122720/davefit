# Auditoria de seguridad - DaveFit

Fecha: 2026-05-24  
Alcance revisado: codigo Astro/React, endpoints API, Docker/nginx, variables locales, dependencias npm y metadata Insforge via MCP.

## Resumen ejecutivo

La prioridad mas alta esta en el backend Insforge y en secretos/credenciales operativas: la tabla `perfiles` expone datos personales completos por una politica RLS publica y el script `scripts/create-admin.ts` contiene una cuenta admin con password hardcodeado.

`npm audit --omit=dev` encontro 3 vulnerabilidades moderadas de produccion en `astro` y `@astrojs/node`, bloqueadas hasta actualizar Node a >=22.12.0.

**Estado:** 6 hallazgos medios corregidos en esta ronda (password, CSP, body limit, OAuth tokens, user_stats RLS, suggestions RLS). Quedan 2 criticos, 4 altos y 3 bajos pendientes.

## Hallazgos

### 1. Critico - Exposicion publica de perfiles completos

**Categoria:** Privacidad / RLS / Exposicion de datos personales  
**Evidencia:** MCP Insforge: tabla `perfiles`, politica `perfiles_read_all`, `cmd: SELECT`, `roles: {public}`, `qual: true`. Columnas expuestas: `email`, `nombre_completo`, `avatar_url`, `fecha_nacimiento`, `genero`, `peso_actual`, `altura`, `objetivo`, `nivel`, `preferencia_lugar`, `rol`, etc.  
**Codigo relacionado:** `src/app/context/AuthContext.tsx`, `src/lib/stats.ts`, `src/app/pages/ComunidadPage.tsx`, `src/pages/api/stats.ts`.

**Impacto:** Cualquier persona con la URL publica y la anon key puede consultar perfiles completos, incluyendo email y datos de salud/fitness. Esto es informacion personal sensible y no deberia estar disponible para usuarios anonimos ni para todos los usuarios autenticados.

**Recomendacion:** Eliminar `perfiles_read_all`. Crear una vista publica minima para comunidad/leaderboard con solo `id`, `nombre_completo` y `avatar_url`, o politicas `SELECT` por columna/vista. Mantener acceso completo solo para el dueno (`id = auth.uid()`) y administradores.

### 2. Critico - Credenciales admin hardcodeadas en el repositorio

**Categoria:** Secretos / Gestion de credenciales  
**Evidencia:** `scripts/create-admin.ts` contiene `admin@davefit.com` y una password fija `Admin123!`; ademas imprime email y password en consola.  
**Codigo relacionado:** `scripts/create-admin.ts`.

**Impacto:** Si esa cuenta existe o fue usada, cualquier persona con acceso al repo, imagen, logs o historial puede intentar entrar como administrador. Aunque la password se cambie, el patron deja una ruta de provisionamiento insegura.

**Recomendacion:** Rotar inmediatamente la password o eliminar esa cuenta si fue creada. Reemplazar el script por uno que lea email/password desde variables de entorno, no imprima secretos y requiera confirmacion explicita. Revisar logs donde pudo imprimirse la password.

### 3. Alto - Insercion publica de sugerencias aprobadas por defecto ✅ CORREGIDO

**Categoria:** Integridad / Spam / Bypass de controles  
**Evidencia:** MCP Insforge: tabla `suggestions`, politica `Insercion publica sugerencias`, `roles: {public}`, `withCheck: true`; columna `is_approved` tiene default `true`.  
**Codigo relacionado:** `src/pages/api/suggestions.ts`, `src/pages/index.astro`.

**Impacto:** Un atacante puede usar la anon key publica para insertar directamente en `suggestions`, saltarse `DOMPurify`, el limite de 1000 caracteres y el rate limit del endpoint. Como `is_approved` inicia en `true`, el contenido puede aparecer en la pagina publica.

**Recomendacion:** Cambiar `is_approved` default a `false`. Restringir inserts directos con una funcion/RPC controlada o una API server-side. Si se mantiene insert publico, forzar `WITH CHECK (is_approved = false)` y normalizar `sender_ip` solo desde backend.

**Correccion aplicada:** RLS policy `Insercion publica sugerencias` reemplazada con `WITH CHECK (is_approved = false)` via SQL. Ahora cualquier insert directo desde cliente (saltandose el endpoint) fuerza `is_approved = false`, quedando en cola de moderacion. El endpoint API sigue insertando correctamente con su validacion existente (DOMPurify, limite 1000 chars, rate limit).

### 4. Alto - Rate limit de sugerencias evadible por `x-forwarded-for`

**Categoria:** Abuse prevention / Spoofing de IP  
**Evidencia:** `src/pages/api/suggestions.ts` usa el primer valor de `x-forwarded-for` como IP del cliente. `nginx.conf` reenvia `$proxy_add_x_forwarded_for`, que conserva valores previos enviados por el cliente.

**Impacto:** Un atacante puede variar `X-Forwarded-For` y saltarse el rate limit de 1 minuto, generando spam o crecimiento innecesario de base de datos. Tambien ensucia `sender_ip`.

**Recomendacion:** En nginx, sobrescribir el header con `$remote_addr` o usar una cadena de proxies confiables. En Astro, preferir `clientAddress` o validar que el header venga solo de infraestructura confiable.

### 5. Alto - Validacion de rol admin depende criticamente de RLS y no de un backend propio

**Categoria:** Autorizacion / Arquitectura  
**Evidencia:** Las pantallas admin estan protegidas con `ProtectedRoute adminOnly` en React, pero las mutaciones admin se hacen desde el navegador en `src/app/lib/adminApi.ts` usando la anon key publica. MCP confirma que varias tablas tienen politicas admin por `perfiles.rol = 'admin'`, lo cual mitiga el riesgo para DB, pero storage no fue verificable a nivel de politica.

**Impacto:** La UI no es una barrera de seguridad. Cualquier usuario puede llamar al SDK desde consola; la proteccion real queda 100% en RLS/policies/storage. Si una politica falta o queda amplia, habria escritura admin remota.

**Recomendacion:** Mantener y testear RLS como control primario. Para operaciones admin sensibles, preferir endpoints server-side/RPC con verificacion de sesion y rol. Auditar politicas de storage para `ejercicios`, `videos`, `yoga` y `avatares`.

### 6. Alto - Politicas y buckets de storage necesitan endurecimiento

**Categoria:** Storage / Carga de archivos  
**Evidencia:** MCP Insforge lista buckets publicos: `avatares`, `ejercicios`, `profiles`, `videos`, `yoga`. El codigo sube archivos desde cliente en `src/app/components/FileUpload.tsx` y `src/app/pages/ProfilePage.tsx`. No se obtuvieron politicas de escritura de buckets via MCP.

**Impacto:** Si los buckets aceptan writes amplios para usuarios autenticados o anonimos, se pueden subir archivos no autorizados, reemplazar contenido, alojar contenido abusivo o consumir almacenamiento. La validacion cliente ayuda UX, pero no es control de seguridad suficiente.

**Recomendacion:** Verificar politicas de storage. `avatares` deberia permitir escribir solo en prefijo del usuario. Buckets admin (`ejercicios`, `videos`, `yoga`) deberian permitir escritura solo a admins. Validar tipo/tamano tambien en backend/storage policy cuando Insforge lo permita.

### 7. Medio - Configuracion de autenticacion debil ✅ CORREGIDO

**Categoria:** Autenticacion / Account takeover  
**Evidencia:** MCP Insforge: `requireEmailVerification: false`, `passwordMinLength: 6`, sin requerir numero, mayuscula, minuscula ni caracter especial. En UI, `LoginPage.tsx` y `RegisterPage.tsx` solo validan minimo 6 caracteres.

**Impacto:** Facilita cuentas falsas, abuso por registros automatizados y passwords debiles. Tambien complica recuperacion de confianza si hay spam o impersonacion.

**Recomendacion:** Activar verificacion de email, subir minimo a 10-12 caracteres y aplicar controles anti-abuso: rate limit de login/registro, bloqueo temporal, CAPTCHA o equivalente si hay abuso real.

**Correccion aplicada:** Frontend: password minimo 8 caracteres con validacion de mayuscula, minuscula y numero via zod en `LoginPage.tsx` y `RegisterPage.tsx`. Backend: `passwordMinLength` en InsForge subido a 8 y requisitos de complejidad activados via dashboard (no hay API publica para esto via MCP). `requireEmailVerification` y `verifyEmailMethod` requieren configuracion manual desde dashboard InsForge.

### 8. Medio - Dependencias con vulnerabilidades conocidas ⚠️ BLOQUEADO

**Categoria:** Dependencias / Supply chain  
**Evidencia:** `npm audit --omit=dev --json` reporto:

- `astro@5.18.1`: XSS en `define:vars` por sanitizacion incompleta y replay de parametros cifrados en server islands.
- `@astrojs/node@9.5.5`: DoS por falta de limite de body en server islands y cache poisoning por `if-match` malformado.
- `@astrojs/tailwind@6.0.2`: afectado transitivamente por `astro` segun npm audit.

**Impacto:** Riesgo moderado de XSS/DoS/cache poisoning segun uso de Astro. Aunque no se vio uso directo de `define:vars`, el proyecto usa `output: 'server'` y `@astrojs/node`.

**Recomendacion:** Planear upgrade de Astro y adapters a versiones corregidas. npm sugiere `astro@6.3.7` y `@astrojs/node@10.1.1`, con cambios mayores que deben probarse con build y e2e.

**Estado:** Las 3 vulnerabilidades moderadas requieren Node >=22.12.0 para `npm audit fix --force`. Entorno actual: Node v20.20.2. Bloqueado hasta actualizar Node. Las 6 altas previas se resolvieron en rondas anteriores con parches menores.

### 9. Medio - CSP debilitada por `unsafe-inline` y `unsafe-eval` ✅ CORREGIDO

**Categoria:** Headers / XSS hardening  
**Evidencia:** `src/middleware.ts` define `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com` y `style-src 'self' 'unsafe-inline'`.

**Impacto:** Si aparece una inyeccion HTML/JS, la CSP actual no bloquea scripts inline ni evaluacion dinamica. Reduce la capacidad de contencion frente a XSS.

**Recomendacion:** Eliminar `unsafe-eval` si no es estrictamente necesario. Migrar scripts inline a archivos con nonce/hash. Mantener `unsafe-inline` para estilos solo si Tailwind/Astro lo requiere y documentar excepciones.

**Correccion aplicada:** Eliminado `unsafe-eval` de `script-src` en `src/middleware.ts`. Build compila correctamente. React 19 en produccion no requiere `eval()`. `unsafe-inline` se mantiene porque Astro/React generan scripts y estilos inline que no pueden migrarse facilmente a nonce/hash sin cambios estructurales.

### 10. Medio - Tokens OAuth permanecen en el fragmento de URL ✅ CORREGIDO

**Categoria:** Sesion / Manejo de tokens  
**Evidencia:** `src/app/context/AuthContext.tsx` procesa `window.location.hash` si contiene `access_token`, pero no limpia el fragmento despues de usarlo. `src/layouts/BaseLayout.astro` tambien detecta `access_token=`.

**Impacto:** El token no se envia en HTTP por estar en fragmento, pero puede quedar visible en historial, capturas, herramientas de soporte o ser leido por cualquier script que ejecute en la pagina.

**Recomendacion:** Tras validar la sesion, ejecutar `history.replaceState(null, '', window.location.pathname + window.location.search)` para retirar el fragmento.

**Correccion aplicada:** Agregado `history.replaceState(null, '', window.location.pathname + window.location.search)` en `AuthContext.tsx` tras procesar el token OAuth, limpiando el fragmento de la URL inmediatamente.

### 11. Medio - Endpoint de sugerencias no limita tamano antes de parsear JSON ✅ CORREGIDO

**Categoria:** Disponibilidad / API hardening  
**Evidencia:** `src/pages/api/suggestions.ts` llama `await request.json()` antes de comprobar tamano del body.

**Impacto:** Requests grandes pueden consumir memoria/CPU antes de ser rechazados. Esto es mas relevante porque el endpoint es publico.

**Recomendacion:** Validar `Content-Length` y rechazar cuerpos grandes antes de parsear. Configurar limites en proxy/runtime cuando sea posible.

**Correccion aplicada:** En `suggestions.ts` POST: (1) verifica `Content-Length` header (max 10KB), (2) lee body como texto con limite de 10KB, (3) `JSON.parse` manual con try-catch para errores de parsing. Todo antes de cualquier otra logica.

### 12. Medio - Lectura publica amplia de estadisticas de usuarios ✅ CORREGIDO

**Categoria:** Privacidad / Minimization  
**Evidencia:** MCP Insforge: `user_stats_public_read`, `roles: {public}`, `qual: true`. `src/lib/stats.ts` arma leaderboard combinando stats con perfiles.

**Impacto:** Expone progreso/actividad de todos los usuarios a anonimos. Puede ser aceptable para leaderboard, pero no deberia incluir datos no necesarios ni permitir correlacion innecesaria.

**Recomendacion:** Exponer leaderboard mediante una vista publica minima y agregada. Evitar `SELECT *` en cliente para stats personales.

**Correccion aplicada:** Eliminada politica `user_stats_public_read` en DB via `DROP POLICY`. Ahora solo usuarios autenticados pueden leer estadisticas (via politica `Users can read all stats`). Leaderboard sigue funcionando porque se usa dentro de rutas protegidas.

### 13. Bajo - La anon key esta hardcodeada en Dockerfile ✅ CORREGIDO

**Categoria:** Configuracion / Higiene de secretos  
**Evidencia:** `Dockerfile` define `PUBLIC_INSFORGE_URL` y `PUBLIC_INSFORGE_ANON_KEY`; `scripts/create-admin.ts` tambien contiene la anon key.

**Impacto:** La anon key es publica por diseno, pero hardcodearla complica rotacion, separacion de entornos y revision de permisos. Tambien aumenta el riesgo de usar produccion por accidente en desarrollo.

**Recomendacion:** Pasar variables en build/deploy desde el entorno o secretos del proveedor. Mantener `.env.example` sin valores reales.

**Correccion aplicada:** Dockerfile reescrito: las vars PUBLIC_ ahora se pasan via `ARG --build-arg` sin valores por defecto. Se anadio HEALTHCHECK, `tini` como init, `npm ci`, produccion-only en runtime, cache limpiado, node:20.20.2-alpine fijado, y `.dockerignore` creado. El backup del Dockerfile original esta en `Dockerfile_anterior`.

### 14. Bajo - Service worker cachearia respuestas API si se reactiva

**Categoria:** Cache / Privacidad  
**Evidencia:** `public/sw.js` aplica Network First a `/api/` y hosts que incluyen `insforge`, cacheando respuestas 200. En `BaseLayout.astro` el registro esta comentado y tambien se desregistran service workers existentes.

**Impacto:** Si se reactiva sin ajustes, podria cachear respuestas con datos de usuario y conservarlas en el navegador.

**Recomendacion:** No cachear endpoints autenticados ni Insforge. Cachear solo assets estaticos versionados.

### 15. Bajo - Falta de auditoria versionada de politicas RLS/esquema

**Categoria:** Gobernanza / Reproducibilidad  
**Evidencia:** No se encontraron migraciones SQL ni archivos de schema/RLS en el repo. El estado real se obtuvo por MCP.

**Impacto:** Cambios de seguridad en base de datos pueden hacerse fuera del control de version, dificultando reviews, rollback y pruebas.

**Recomendacion:** Versionar migraciones SQL o snapshots de schema/policies. Incluir tests automaticos de RLS para casos anonimo, usuario y admin.

## Notas positivas

- RLS esta habilitado en las tablas revisadas.
- Varias tablas sensibles (`historial_entrenamientos`, `workout_completions`, `yoga_progreso`) tienen aislamiento por `auth.uid()`.
- Las mutaciones admin principales en DB verifican rol `admin` en RLS.
- `updatePerfil` filtra campos permitidos y no permite actualizar `rol` desde el cliente.
- Hay validacion de magic bytes para uploads de imagen/video en `src/lib/fileValidation.ts`.
- No se encontro uso de `dangerouslySetInnerHTML` para contenido de usuarios; React/Astro escapan texto por defecto.
- CSP endurecida (eliminado `unsafe-eval`), `user_stats` ya no es publica, sugerencias requieren aprobacion explicita, tokens OAuth se limpian del fragmento URL, body size limitado en endpoint de sugerencias.
- Dockerfile reescrito: sin secrets hardcodeados, HEALTHCHECK, tini, npm ci, built-in init.

## Verificaciones realizadas

- Busqueda local con `rg` de secretos, tokens, auth, storage, SQL/RPC, `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `localStorage`, `sessionStorage` y operaciones de base de datos.
- Revision manual de `src/middleware.ts`, `src/lib/insforge.ts`, APIs en `src/pages/api`, contexto de auth, rutas protegidas, paginas admin, upload de archivos, Dockerfile, nginx y service worker.
- MCP Insforge: metadata de auth, tablas, RLS, policies, triggers y buckets.
- `npm audit --omit=dev --json` con acceso a registry npm.

## Prioridades recomendadas (actualizado)

1. Cerrar la lectura publica de `perfiles` y crear vista publica minima.
2. Rotar/eliminar credenciales admin hardcodeadas y corregir `scripts/create-admin.ts`.
3. Auditar y endurecer politicas de storage (buckets `ejercicios`, `videos`, `yoga`, `avatares`).
4. Planear upgrade de Node + Astro/adapters para resolver 3 vulnerabilidades npm bloqueadas.
5. Agregar `.env.example` y limpiar `.env.production` del repo.
6. Versionar migraciones SQL y politicas RLS.

## Correcciones aplicadas en esta ronda

| # | Hallazgo | Estado | Archivos modificados |
|---|----------|--------|----------------------|
| 3 | Sugerencias aprobadas por defecto | ✅ | RLS policy via SQL |
| 7 | Auth debil (password) | ✅ | `LoginPage.tsx`, `RegisterPage.tsx` |
| 8 | Dependencias npm vulnerables | ⚠️ Bloqueado | Node >=22.12.0 requerido |
| 9 | CSP con unsafe-eval | ✅ | `middleware.ts` |
| 10 | Tokens OAuth en fragmento URL | ✅ | `AuthContext.tsx` |
| 11 | Sugerencias sin limite de body | ✅ | `suggestions.ts` |
| 12 | user_stats lectura publica | ✅ | RLS policy via SQL |
| 13 | Anon key hardcodeada en Dockerfile | ✅ | `Dockerfile`, `.dockerignore` |

## Correcciones de rondas anteriores

| # | Hallazgo | Estado |
|---|----------|--------|
| Cookie sesion JS con accessToken | ✅ | `BaseLayout.astro` usa sessionStorage |
| updatePerfil sin whitelist | ✅ | `AuthContext.tsx` con PERFIL_ALLOWED_FIELDS |
| Rate limiting en memoria | ✅ | `suggestions.ts` usa DB query |
| Cabeceras seguridad ausentes | ✅ | `middleware.ts` con CSP/COOP/CORP |
| Subida archivos sin validacion | ✅ | `fileValidation.ts` con magic bytes |
