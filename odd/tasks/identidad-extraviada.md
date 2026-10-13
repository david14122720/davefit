# Feature: identidad-extraviada — Perfil roto para usuarios sin fila de stats

**Estado**: completada (pendiente: aceptación del usuario + decisión sobre blindaje RPC)
**Creada**: 2026-10-12

## Objetivo

Que `/perfil` nunca muestre "Identidad Extraviada" por falta de fila en
`user_stats`, y que el pipeline que crea esa fila (RPC de gamificación)
realmente funcione.

## Diagnóstico (cadena completa, verificada)

1. `ProfilePage` llama `getUserStats(user.id)` → `maybeSingle()` en
   `user_stats` → **sin fila devuelve `null`** → la página entera se
   reemplaza por el error "Identidad Extraviada". El botón
   "Reestablecer Perfil" solo hace `window.location.reload()` → nunca arregla.
2. **Nada crea la fila `user_stats`** salvo el RPC
   `process_workout_completion` (SECURITY DEFINER): "IF NOT FOUND THEN
   INSERT INTO user_stats...".
3. `invokeRpc` (`src/lib/insforge.ts`) apuntaba a **`/rest/v1/rpc/...` →
   404 siempre** (ruta inexistente; la real es `/api/database/rpc/...`,
   la misma que usa el SDK). → El RPC jamás corría → los usuarios nuevos
   nunca obtenían fila → "Identidad Extraviada" garantizada.
4. En la DB prod: 3 perfiles, 2 filas `user_stats` — la cuenta
   "juana de arco" es la que no tiene fila (reproduce el error).

## Fixes aplicados (código)

- [x] **F1** `src/lib/stats.ts`: `buildEmptyUserStats(userId)`; sin fila →
      stats en cero (nivel 1), **no null**. `null` queda para errores reales.
      Test nuevo en `src/lib/stats.test.ts` (RED→GREEN).
- [x] **F2** `src/lib/insforge-url.ts`: `buildRpcUrl()` →
      `/api/database/rpc/{fn}`; `invokeRpc` lo usa (adiós `/rest/v1`).
      Tests: 2 casos (ruta + encoding).

## Verificación

- Suite **104/104** (22 archivos), tsc 13 (paridad), eslint 0 errores.
- RPC a través del proxy `:4321` con la URL nueva → **ejecuta** en el backend
  (la FK rechazó solo el uuid de prueba inexistente; sin filas fantasma).
- Probe previo directo al backend: ruta real confirmada con
  `PGRST202`/ejecución; `/rest/v1/rpc` era 404 puro.

## Pendiente de decisión del usuario (seguridad, NO aplicado)

El RPC es **SECURITY DEFINER** y **`anon` tiene EXECUTE**: cualquiera puede
llamarlo con un `req_user_id` arbitrario de un usuario REAL y inflarle XP/
rachas (el FK solo bloquea uuids inexistentes). Propuesta de blindaje (DDL,
requiere OK explícito):
1. `REVOKE EXECUTE ON FUNCTION process_workout_completion FROM anon;`
2. Validar dentro de la función que `req_user_id = auth.uid()` (o eliminar el
   parámetro y usar `auth.uid()` internamente).
   Con el proxy same-origin el navegador manda el JWT del usuario →
   `authenticated` sigue pudiendo ejecutar.

## Notas

- La cuenta sin fila verá su perfil con ceros; la fila real se crea en su
  primer entrenamiento (con F2 arreglado). Backfill manual opcional (INSERT
  de una fila en cero) si se quiere antes — decisión del usuario.
- Sin git (instrucción del usuario).
