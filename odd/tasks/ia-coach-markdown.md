# Feature: IA Coach — Markdown seguro + streaming (efecto tipeo)

Objetivo: renderizar las respuestas del Coach IA con formato Markdown (negritas, cursivas, saltos de línea, listas/viñetas), neutralizar enlaces, efecto tipeo fluido y tolerante a fragmentos incompletos, 100 % anti-XSS; Judgment Day al final.

Base: working tree local sobre `75f0876` · Delivery: **sin commits** (regla del pedido) · Runner: `npx vitest run` + `npx playwright test e2e/coach.spec.ts` (backend real) + `playwright-cli`.

Reglas estrictas del pedido: ODD · conexión exclusiva a DB de **PRODUCCIÓN** · **prohibido `git commit` / `git push`** · validación visual con **`playwright-cli` obligatoria** durante y después del streaming · **Judgment Day** al final.

## Specs

- **S1 — Renderizado de Markdown (frontend).** El chat debe transformar las respuestas del modelo (hoy texto plano) en texto con formato. Obligatorios: negritas, cursivas, saltos de línea y —con especial importancia— listas y viñetas.
  - Cita textual: «Debe renderizar obligatoriamente negritas, cursivas, saltos de línea y, con especial importancia, **listas y viñetas** (para mostrar correctamente las rutinas y ejercicios).»
- **S2 — Enlaces neutralizados.** «El procesador DEBE bloquear, eliminar o renderizar como texto plano cualquier enlace (URL/hyperlink) generado por la IA. No deben existir etiquetas `<a>` clickeables en el DOM resultante.»
- **S3 — Streaming / efecto tipeo.** «La renderización del Markdown debe ser compatible con la recepción de texto por streaming. El efecto de "escribir en tiempo real" debe ser fluido. El parser debe ser capaz de manejar fragmentos incompletos de Markdown sin romper la estructura visual o dejar etiquetas HTML abiertas temporalmente.»
  - Criterio 1: «Al recibir respuesta del IA Coach, el texto se escribe progresivamente ("efecto tipeo") sin que el diseño parpadee o se rompa.»
- **S4 — Sanitización anti-XSS.** «Antes de inyectar cualquier HTML renderizado en el DOM, el texto procesado debe pasar obligatoriamente por un sanitizador robusto (ej. DOMPurify o el equivalente seguro del framework).» Config: permitir estructura (listas, negritas, saltos) y purgar scripts, iframes, atributos `on*` y atributos peligrosos.
  - Criterio 4: «El renderizado es 100% seguro contra inyecciones XSS.»
- **S5 — Aceptación y validación.** Criterio 2: «Las rutinas y viñetas se formatean como listas HTML reales, y los textos entre asteriscos se ven en negrita.» Criterio 3: «Si el modelo devuelve un enlace, la interfaz lo neutraliza (no es clickeable).» Criterio 5: «El "Día del Juicio" se completa exitosamente sin reportar regresiones en la interfaz ni en el backend.» Validación visual obligatoria con `playwright-cli` durante y después del streaming.

## Decisiones de implementación (assumptions)

- `marked@18` (parser) + `dompurify@3` (sanitizador explícito, pedido por S4): allowlist mínima de tags estructurales, `ALLOWED_ATTR: []` (ningún atributo sobrevive), `FORBID_TAGS: ['a']` con `KEEP_CONTENT` → un enlace queda como texto plano, nunca `<a>`.
- El gateway de IA NO streamea (devuelve el texto completo): el efecto tipeo se genera en el cliente revelando prefijos progresivos (fragmentos) y re-parseando en cada tick — así el parser demuestra tolerancia real a fragmentos incompletos (S3).
- Mensajes del usuario: texto plano (React escapa por defecto); solo las respuestas de la IA pasan por el renderer.

## Tasks

| ID | Specs | Tarea | Ruta | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| T1 | S1,S2,S4 | `marked`+`dompurify` en deps; `src/app/lib/markdown.ts` (renderer + sanitizador) + tests unit RED→GREEN | inline | ✅ | RED 12F/3P → GREEN **15/15** (`src/app/lib/__tests__/markdown.test.ts`) |
| T2 | S3 | `src/app/hooks/useTypewriter.ts` (revelado progresivo por ticks, code-point safe) + tests | inline | ✅ | RED 2F/2P → GREEN **4/4** (`src/app/hooks/__tests__/useTypewriter.test.ts`) |
| T3 | S1,S3 | CoachPage: bubble de la IA con markdown sanitizado + efecto tipeo + autoscroll; tests de página (nuevos + ajustes por timing) | inline | ✅ | RED 2F → GREEN **6/6** (`src/app/pages/CoachPage.test.tsx`) |
| T4 | S5 | `e2e/coach.spec.ts`: listas reales, cero `<a>` en el chat, evidencia during/final; suite completa (vitest + build + lint) | inline | ✅ | e2e **2/2** (18.7 s) · vitest **168/168** · build OK · eslint **0 errors** · tsc sin errores nuevos |
| T5 | S5 | Visual `playwright-cli` (durante + después del streaming) + Judgment Day (ronda 1 → fix → ronda 2) | inline | ✅ | `coach-md-streaming-cli.png` (mid-typing) · `coach-md-final.png` · `coach-md-snapshot.txt` · evals CLI: li=12, `<a>`=0, strong=5, `**`=false · **JD ronda 2: AMBOS jueces APROBADO** (`ia-coach-markdown.judgment.md`) |

## Log

### L1 — Pedido original (2026-10-13, verbatim)

```
genial ahora mejoralo un poquito: # ODD Spec: Renderizado Seguro de Markdown y Streaming en IA Coach

## 1. Reglas Estrictas de Entorno (Globales)
- **Metodología:** Organic-Driven Development (ODD).
- **Base de Datos:** Mantén la conexión exclusiva con la base de datos de PRODUCCIÓN.
- **Control de Versiones:** Prohibido realizar `git commit` o `git push`.
- **Validación Visual:** Usa `playwright-cli` obligatoriamente para verificar que los mensajes se rendericen correctamente durante y después del streaming.
- **Validación de Integridad:** Ejecuta tu proceso interno de verificación ("Judgment Day" / verify) al finalizar la implementación.

## 2. Descripción del Problema
Actualmente, la UI del IA Coach está renderizando las respuestas del modelo como texto plano. Los caracteres de formato Markdown (como `**texto**` para negritas) se muestran literalmente en pantalla en lugar de aplicar el estilo visual HTML correspondiente.

## 3. Requerimientos de Funcionalidad (Frontend)
- **Procesamiento de Markdown:** Implementa un procesador/parser de Markdown en el componente del chat para transformar las respuestas del modelo en texto con formato.
- **Elementos Permitidos:** Debe renderizar obligatoriamente negritas, cursivas, saltos de línea y, con especial importancia, **listas y viñetas** (para mostrar correctamente las rutinas y ejercicios).
- **Restricción Estricta de Enlaces:** El procesador DEBE bloquear, eliminar o renderizar como texto plano cualquier enlace (URL/hyperlink) generado por la IA. No deben existir etiquetas `<a>` clickeables en el DOM resultante.
- **Soporte para Streaming (Efecto Tipeo):** La renderización del Markdown debe ser compatible con la recepción de texto por streaming. El efecto de "escribir en tiempo real" debe ser fluido. El parser debe ser capaz de manejar fragmentos incompletos de Markdown sin romper la estructura visual o dejar etiquetas HTML abiertas temporalmente.

## 4. Requerimientos de Seguridad Crítica
- **Sanitización Contra XSS:** Antes de inyectar cualquier HTML renderizado en el DOM, el texto procesado debe pasar obligatoriamente por un sanitizador robusto (ej. DOMPurify o el equivalente seguro del framework) para prevenir ataques de Cross-Site Scripting (XSS).
- **Configuración de Políticas:** Asegúrate de que la configuración del sanitizador permita los elementos estructurales requeridos (listas, negritas, saltos) pero purgue implacablemente scripts, iframes, atributos on* (ej. onclick) y atributos peligrosos.

## 5. Criterios de Aceptación
1. Al recibir respuesta del IA Coach, el texto se escribe progresivamente ("efecto tipeo") sin que el diseño parpadee o se rompa.
2. Las rutinas y viñetas se formatean como listas HTML reales, y los textos entre asteriscos se ven en negrita.
3. Si el modelo devuelve un enlace, la interfaz lo neutraliza (no es clickeable).
4. El renderizado es 100% seguro contra inyecciones XSS.
5. El "Día del Juicio" se completa exitosamente sin reportar regresiones en la interfaz ni en el backend.
```

### L2 — T1/T2 test-first (2026-10-13)

- T1: tests primero (15 casos) contra stub plain-text → **RED 12F/3P**; implementación `marked@18` + `DOMPurify@3` (allowlist estricta de tags estructurales, `ALLOWED_ATTR: []`, `FORBID_TAGS: ['a']` + `KEEP_CONTENT`) → **GREEN 15/15**.
- Fragmentos: banco de 150+ prefijos del sample real (con emoji) — ningún prefijo produce `<script>`, `<a>` ni `onerror`.
- Hallazgo: `marked` emite un `\n` tras el último tag → aparecía en `textContent`; se normaliza con `.trim()` en la salida (lo detectó el `toBe` estricto del test de página).
- T2: hook con **RED 2F/2P → GREEN 4/4**; revelado por code points (emojis seguros), `onTick` para autoscroll, `enabled:false` (historial) sin parpadeo.

### L3 — T3 integración CoachPage (2026-10-13)

- `ChatBubble`: tipeo + `renderCoachMarkdown(textoVisible)` inyectado con `dangerouslySetInnerHTML` SOLO para la IA; los mensajes del usuario siguen en texto plano (React escapa).
- Autoscroll pinneado: si el usuario está pegado al fondo (<80 px) el tipeo mantiene el scroll; si scrolleó arriba, no se le pelea.
- **RED 2F** (testids/formato inexistentes) → **GREEN 6/6**. Test de progresión con texto sin markdown (`textContent` 1:1) + test de markdown (espera `strong`/`li`, cero `<a>`, sin `**`).

### L4 — T4 verificación (2026-10-13)

- `e2e/coach.spec.ts` ampliado: 2.º mensaje de lista → `toHaveCount(2)`, `li` visible durante el tipeo, screenshots during/final; aserciones: cero `<a>` en el chat, sin `**`, cuota −2 → **2/2 passed (18.7 s)**.
- Suite: vitest **168/168** (34 archivos; +21 nuevos), build OK, eslint **0 errores**, `tsc` sin errores nuevos (4 errores pre-existentes en `MobileDrawer.tsx` / `PublicLayout.tsx` / `BibliotecaPage.test.tsx`, los 3 byte-idénticos a HEAD).
- Precondición: cuota E2E reseteada vía SQL (delete de `coach_usage`) antes de la corrida.

### L5 — T5 validación visual playwright-cli (2026-10-13)

- Login real con la cuenta E2E → `/coach` (10/10 tras reset).
- Mensaje "Armame una semana de entrenamiento acorde a mi objetivo" → plan real por días; estado final vía evals: `li`=12, `<a>`=0, `strong`=5, `**`=false, cuota 9/10; snapshot a11y con `list`/`listitem`/`strong` guardado en `coach-md-snapshot.txt`.
- Mid-typing: el poll de `eval` no alcanzó la ventana (~1.5 s vs roundtrip); con ráfaga de screenshots se capturó `coach-md-streaming-cli.png` con texto cortado a mitad de palabra ("Descan") y estructura intacta.
- Judgment Day ronda 1: EN CURSO.

### L6 — T5 Judgment Day ronda 1 → correcciones (2026-10-13)

- **Ronda 1 (2 jueces ciegos)**: SIN hallazgos CRITICAL — specs S1–S5 OK en ambos (49 + 25 vectores XSS/enlace, 278 + 403 prefijos de streaming, cero escapes estructurales; suite 168/168; sin regresión del MVP).
- Hallazgos accionables corregidos en batch único:
  1. **`data-*` sobrevivían** el sanitizado (DOMPurify default `ALLOW_DATA_ATTR: true` bypasea `ALLOWED_ATTR: []`, reproducible) → `ALLOW_DATA_ATTR: false` + test (JD-B-001).
  2. **El tick final del tipeo no disparaba `onTick`** (última franja sin autoscroll estando pinneado) → `onTick` corre en cada tick, incluido el de completado (JD-B-002 / A-I4).
  3. **Spam de `aria-live`** durante el tipeo (~50 mutaciones/mensaje) → `aria-busy={isTyping}` en la burbuja que muta (JD-B-003 / A-I2).
  4. **Emojis compuestos** (familia/bandera) se partían: el claim "nunca parte emojis" era falso para grafemas → segmentación por grafemas (`Intl.Segmenter`, fallback code points) + test con 🇦🇷 y 👨‍👩‍👧‍👦 (A-W1).
- Tests nuevos: `data-*` purgado, mensaje de usuario literal (sin markdown), prefijos por grafemas (se corrigió un off-by-one del propio test detectado en la corrida — el hook ya segmentaba bien).
- Re-verificación: alcance **27/27** → suite **170/170**, build OK, `tsc` sin errores nuevos, eslint limpio en los archivos del cambio.
- INFO pendientes (documentados, no corregidos): imágenes descartadas en silencio (no se conserva el `alt`), parpadeo transitorio con bloques HTML crudos sin cerrar, costo de re-parseo ~6 ms/tick, gaps menores de test (tablas GFM, `pre`/`code`/`blockquote`) y cableado latente de `animate` para historial.
- Ronda 2 escopada: **AMBOS JUECES APROBADO** — los 4 hallazgos CERRADOS con repro independiente (6 vectores `data-*`, último tick de `onTick` con texto completo, mitigación aria-busy aceptada, grafemas íntegros); sin CRITICAL/WARNING nuevos; 3 INFO residuales documentados (onTick espurio al montar, aria-busy descendiente, fallback sin Segmenter). Suite **170/170** · build OK · veredicto completo en `odd/tasks/ia-coach-markdown.judgment.md`.
- **T5 COMPLETADO — feature cerrada con APPROVED (sin commits, según la regla del pedido).**
