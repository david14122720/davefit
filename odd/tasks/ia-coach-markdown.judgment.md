# Judgment Day — IA Coach: Markdown seguro + streaming (efecto tipeo)

Feature: `odd/tasks/ia-coach-markdown.md` · Rondas: 2 · Veredicto final: **APROBADO ✅**

## Ronda 1 (2 jueces ciegos, revisión adversarial)

- **Juez A**: SIN CRITICAL — S1–S5 OK. 1 WARNING (emojis compuestos se parten: claim "nunca parte emojis" falso para familia/bandera) + 3 INFO (spam `aria-live`, imágenes descartadas en silencio, tick final sin `onTick`).
- **Juez B**: SIN CRITICAL — S1–S5 OK. 3 WARNING (`data-*` sobreviven el sanitizado — reproducido; tick final sin autoscroll; spam `aria-live`) + 4 INFO (tablas GFM colapsan, parpadeo transitorio con bloques HTML crudos, costo de re-parse ~6 ms/tick, gaps de test).
- Verificación cruzada ronda 1: **49 + 25 vectores XSS/enlace** y **278 + 403 prefijos de streaming** — cero escapes estructurales; suite 168/168; sin regresión del MVP.

## Fix round (batch único tras ronda 1)

1. `ALLOW_DATA_ATTR: false` en el sanitizador (JD-B-001) + test de repro.
2. `onTick` ahora corre también en el tick de completado (JD-B-002 / A-I4).
3. `aria-busy={isTyping}` en la burbuja que muta durante el tipeo (JD-B-003 / A-I2).
4. Segmentación por grafemas (`Intl.Segmenter` + fallback code points) (A-W1) + test con 🇦🇷 y 👨‍👩‍👧‍👦.
5. Tests nuevos: `data-*` purgado; mensaje de usuario literal (sin markdown).

## Ronda 2 (re-juicio ESCOPADO, ambos jueces)

- **JD-B-001 (data-*)**: CERRADO — repro independiente: 6 vectores, ninguno deja `data-`; `<p>t</p>` limpio.
- **JD-B-002 (tick final)**: CERRADO — repro React real: el último tick dispara `onTick` con el texto completo.
- **JD-B-003 (aria-live)**: CERRADO — mitigación razonable (patrón estándar; riesgo residual documentado).
- **A-W1 (grafemas)**: CERRADO — ningún tick produce emojis a medias ni surrogates sueltos.
- **Hallazgos nuevos del diff**: NINGUNO CRITICAL ni WARNING. INFO residuales: `onTick` espurio al montar burbujas `enabled:false` (inocuo), `aria-busy` en descendiente de la live region (algunos AT pueden ignorarlo), fallback sin Segmenter degrada grafemas ZWJ (estético).
- Re-verificación: suite **170/170**, `tsc` solo los 4 errores baseline (archivos intactos a HEAD).
- **AMBOS JUECES: APROBADO**

## Follow-ups (INFO documentados, no corregidos)

- Imágenes del modelo se descartan en silencio (no se conserva el `alt`; S1 no las exige).
- Parpadeo transitorio de la cola con bloques HTML crudos sin cerrar (cero impacto de seguridad).
- Costo de re-parseo por tick (~6.3 ms en respuestas máximas; fluido en desktop).
- Tablas GFM no soportadas (no pedidas por la spec).
- Gaps de test menores (tags `pre`/`code`/`blockquote`, chequeo e2e de cero `<a>` solo al final).
