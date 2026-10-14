# Rediseño Integral y Responsivo — Stitch "Rediseño Web Fitness" (Obsidian Kinetic)

**Objetivo:** Rediseñar la UI de las 8 páginas existentes para coincidir con los diseños Stitch del proyecto `Rediseño Web Fitness` (desktop + móvil), sin romper funcionalidad, contra DB de producción. Sin operaciones git.
**Branch:** `main` (SIN commits ni push — pedido explícito).
**Test runner:** `npx vitest run` (unit) · `npx playwright test` (e2e) · `playwright-cli` (validación visual desktop + móvil).
**Diseños locales:** `/tmp/opencode/stitch/{pagina}-{desktop|mobile}.{html,png}` (HTML auto-contenido, renderizable local).
**Screens Stitch (project 1533009109550892227):**

| Página app | Ruta | Screen desktop | Screen móvil |
|---|---|---|---|
| Login | `/login` | 17445230ad4745409cd37a7016c07be4 | 3d634cf20c974f0396f47cd7dcff67fb |
| Registro | `/register` | 79eb6c5595c14866a3e5f3b0a4a421ff | ae07169ae84a44d39fd1305512e19685 |
| Dashboard | `/dashboard` | ad114432af2a4766b43048728c4912e4 | 6930a767622d461bbc9229911083998d |
| Biblioteca rutinas | `/biblioteca` | 3503fef2f1e4489b94eeabd1fc104aba | c25ad07109724094be472578c43487d9 |
| Recetas | `/nutricion` | 0c74fd6d98624bdca5b5ee87e0093db3 | 727a55ee74bc41f1b7bf5e520b6d3dfd |
| Comunidad | `/comunidad` | 980c1ec8ef714a7099bb36906f433867 | 8466371ca7aa4487ba7fcb2b79c53419 |
| Perfil | `/perfil` | c0029485088345c3b53c9d8057ca8bec | f97b430a0a8947448d292e191346a37c |
| Coach IA | `/coach` | df5a225bdcda480ca1eba82f11fdbe20 | f718ad01e28e4185862687aafbdd5056 |

## Specs

- **S1 — Metodología:** ODD (Organic-Driven Development). (verbatim: "Metodología: Organic-Driven Development (ODD).")
- **S2 — DB producción:** "Base de Datos: Mantén la conexión y el uso exclusivo de la base de datos de PRODUCCIÓN. Está estrictamente prohibido crear, inicializar o migrar bases de datos en el entorno local."
- **S3 — Validación visual continua:** "Usa tu skill de `playwright-cli` de forma recurrente para observar cómo va quedando la interfaz en el servidor local. Debes asegurar que el diseño sea perfecto tanto en vista de computadora como en dispositivos móviles."
- **S4 — Sin git:** "Control de Versiones: NO realices operaciones de git (ni commits, ni push)."
- **S5 — Stitch fuente de verdad:** "Inspección: Utiliza el MCP de `stitch` para inspeccionar el nuevo diseño de la página. El proyecto ya está en tu contexto."
- **S6 — Límite de acción:** "Copia y adapta el diseño estricto SÓLO para la funcionalidad que ya existe en el código. No intentes programar lógica compleja de backend o nuevos flujos pesados que aparezcan en Stitch."
- **S7 — Elementos pequeños permitidos:** "Si el diseño incluye nuevos elementos que son 'pequeños' (por ejemplo: insignias, iconos, etiquetas, textos informativos estáticos o ajustes menores de maquetación), tienes total autorización para añadirlos a la interfaz."
- **S8 — Ejecución autónoma:** "Debes avanzar de forma autónoma. No te detengas, no devuelvas el control ni pidas autorización para los siguientes pasos hasta que el rediseño completo de la página aplicable haya concluido al 100%."
- **S9 — Validación por iteración:** "Después de cada cambio aplicado en la interfaz, debes ejecutar obligatoriamente el proceso de verificación o 'Día del Juicio' (Judgment Day) para testear y garantizar que la modificación visual no rompió ninguna funcionalidad previa. Si algo se rompe, repáralo inmediatamente."
- **S10 — Criterios de aceptación (verbatim):**
  1. "La apariencia de la página local coincide de manera exacta con los diseños analizados mediante el MCP de Stitch (omitiendo las funcionalidades mayores que aún no existen)."
  2. "Los pequeños elementos visuales o detalles nuevos de Stitch han sido incorporados con éxito."
  3. "La interfaz es completamente responsiva y ha sido validada visualmente para celular y escritorio usando Playwright."
  4. "El ciclo completo ha finalizado asegurando que toda la funcionalidad original se mantiene intacta y operativa contra la base de datos de producción."

**Assumption (marcada):** por S9 el "proceso de verificación" por iteración se ejecuta como verificación funcional + visual por página (tests focales + full suite + screenshots desktop/móvil); el Judgment Day formal (2 jueces ciegos) corre al cierre del rediseño sobre el artefacto completo. Si el usuario quiere JD formal por página, se ajusta.

## Tasks

| ID | Tarea | Specs | Ruta | Estado |
|---|---|---|---|---|
| T0 | Fundación: tokens Obsidian Kinetic en `global.css` + fuente Plus Jakarta Sans (BaseLayout) | S1,S10.2 | inline | ✅ |
| T1 | Login `/login` (LoginPage) desktop+móvil | S3,S5,S6,S7 | inline | ✅ |
| T2 | Registro `/register` (RegisterPage) desktop+móvil | S3,S5,S6,S7 | inline | ✅ |
| T3 | Dashboard `/dashboard` (DashboardPage) desktop+móvil | S3,S5,S6,S7 | delegado | ✅ |
| T4 | Biblioteca rutinas `/biblioteca` (BibliotecaPage) desktop+móvil | S3,S5,S6,S7 | delegado | ✅ |
| T5 | Recetas `/nutricion` (NutritionPage) desktop+móvil | S3,S5,S6,S7 | delegado | ✅ |
| T6 | Comunidad `/comunidad` (ComunidadPage) desktop+móvil | S3,S5,S6,S7 | delegado | ✅ |
| T7 | Perfil `/perfil` (ProfilePage) desktop+móvil | S3,S5,S6,S7 | delegado | ✅ |
| T8 | Coach IA `/coach` (CoachPage) desktop+móvil | S3,S5,S6,S7 | delegado | ✅ |
| T9 | Header/nav compartido (PublicLayout, NavLinks, MobileDrawer) según diseños | S5,S7 | inline | ✅ |
| T10 | Verificación final: vitest full + e2e + visual desktop/móvil + Judgment Day | S9,S10 | — | ✅ |

**Evidencia por tarea (T1–T9):** screenshot desktop + móvil del local; comandos de verificación con resultado observado; tests focales de la página.

## Log

**L1 (2026-10-13) — pedido del usuario (verbatim):**
> si ese es el nuestro amigo hoy vamos hacer un rediseño de la pagina :# ODD Spec: Rediseño Integral y Responsivo (App de Gimnasio)
>
> ## 1. Reglas Estrictas de Entorno (Globales)
> - **Metodología:** Organic-Driven Development (ODD).
> - **Base de Datos:** Mantén la conexión y el uso exclusivo de la base de datos de PRODUCCIÓN. Está estrictamente prohibido crear, inicializar o migrar bases de datos en el entorno local.
> - **Validación Visual Continua:** Usa tu skill de `playwright-cli` de forma recurrente para observar cómo va quedando la interfaz en el servidor local. Debes asegurar que el diseño sea perfecto tanto en vista de computadora como en dispositivos móviles.
> - **Control de Versiones:** NO realices operaciones de git (ni commits, ni push).
>
> ## 2. Fuente de Verdad y Alcance del Diseño (Reglas de Stitch)
> - **Inspección:** Utiliza el MCP de `stitch` para inspeccionar el nuevo diseño de la página. El proyecto ya está en tu contexto.
> - **Gestión de Faltantes:** Ten en cuenta que el diseño actual en Stitch incluye secciones o apartados completos que **aún no están programados** en la aplicación real.
> - **Límite de Acción:** Copia y adapta el diseño estricto **SÓLO para la funcionalidad que ya existe** en el código. No intentes programar lógica compleja de backend o nuevos flujos pesados que aparezcan en Stitch.
> - **Permiso para Elementos Pequeños:** Si el diseño incluye nuevos elementos que son "pequeños" (por ejemplo: insignias, iconos, etiquetas, textos informativos estáticos o ajustes menores de maquetación), tienes total autorización para añadirlos a la interfaz.
>
> ## 3. Flujo de Ejecución y Día del Juicio (Obligatorio)
> - **Ejecución Autónoma Ininterrumpida:** Debes avanzar de forma autónoma. No te detengas, no devuelvas el control ni pidas autorización para los siguientes pasos hasta que el rediseño completo de la página aplicable haya concluido al 100%.
> - **Validación por Iteración:** Después de cada cambio aplicado en la interfaz, debes ejecutar obligatoriamente el proceso de verificación o "Día del Juicio" (Judgment Day) para testear y garantizar que la modificación visual no rompió ninguna funcionalidad previa. Si algo se rompe, repáralo inmediatamente.
>
> ## 4. Criterios de Aceptación
> 1. La apariencia de la página local coincide de manera exacta con los diseños analizados mediante el MCP de Stitch (omitiendo las funcionalidades mayores que aún no existen).
> 2. Los pequeños elementos visuales o detalles nuevos de Stitch han sido incorporados con éxito.
> 3. La interfaz es completamente responsiva y ha sido validada visualmente para celular y escritorio usando Playwright.
> 4. El ciclo completo ha finalizado asegurando que toda la funcionalidad original se mantiene intacta y operativa contra la base de datos de producción.

**L2 (2026-10-13) — Recon:**
- `playwright-cli` disponible en `/home/david/.local/bin/playwright-cli`; dev server vivo en `:4321` (Astro, PID de sesión previa).
- Stitch accesible: 4 proyectos; el nuestro `1533009109550892227` "Rediseño Web Fitness". 16 screens (8 páginas × desktop/móvil) + imágenes de referencia. Las 4 marcadas "Generating..." resultaron ser Perfil ×2 y Coach IA ×2 completas.
- Diseños descargados a `/tmp/opencode/stitch/` (HTML auto-contenido con Tailwind CDN + config brand/dark extras; PNG thumbnails 512px de baja resolución — la referencia fina se hace renderizando el HTML local).
- Tokens actuales en `src/styles/global.css`: primary `#ff6b00`, bg `#0a0a0a`, font Inter. Diseño pide primary `#ff5e00`, canvas `#0b0b0c`, superficies `#121316`/`#1a1b1f`, texto `#f8f9fa`/`#9ea3ae`, font Plus Jakarta Sans (+Inter).
- Marca: diseños muestran "DaveFit" (dashboard) y "FitDave" (login) — **se mantiene "DaveFit"**, el nombre real de la app.

**L3 (2026-10-13) — Próximo paso:** T0 (fundación de tokens + fuente) y luego T1 (login). La evidencia real de cada tarea se anexa aquí al completarse (nada se marca ✅ sin resultado observado).

**L4 (2026-10-13) — T0 ✅ Fundación:** tokens Obsidian Kinetic en `global.css` (primary `#ff5e00`, light `#fb923c`, dark/hover `#ea580c`, bg `#0b0b0c`, darker `#08080a`, card `#121316`, surface `#1a1b1f`, elevated `#22242a`, on-surface `#f8f9fa`, variant/muted `#9ea3ae`) + Plus Jakarta Sans (400–800) en `BaseLayout.astro` (link + body font + bg `#0b0b0c`) y `--font-sans`. Evidencia: screenshots T0 desktop/móvil (login old-layout con tokens nuevos) — app viva, sin errores de consola.

**L5 (2026-10-13) — T2 ✅ Registro:** `RegisterPage.tsx` al diseño Stitch (hero desktop con glow radial/gradiente en H1/badge "Plan Estudiante Activo"/social proof MR-SL-CP/garantía; form con Google, divisor doble línea, campos h-11 `#141418`, shield-check en email, barra de fuerza conservada, CTA "Crear Cuenta"). Móvil: hero card (marca, badge escuela, "Crea tu Cuenta", avatares D/A/V +2k, pill 4.9/5), form en card, perks "Sin tarjeta/100% libre". Checkbox de términos OMITIDO (mismo criterio S6; se conserva el legal footer como texto de consentimiento). Módulo compartido nuevo `src/app/components/auth-brand.tsx` (SVGs exactos del diseño; LoginPage refactorizado para usarlo). Verificación: vitest Register **6/6 ✅** (+ Login 6/6), visual desktop 1280 + móvil 390 vs diseño renderizado local (calza; difiere sólo el checkbox omitido), validación funcional del form (errores zod visibles al submit vacío ✅ sin datos creados en prod). Screenshots: `t2-reg-desktop.png`, `t2-reg-mobile.png`, `t2-reg-validation.png`.

**L6 (2026-10-13) — T3 ✅ Dashboard (delegado a worker + verificación del orquestador):** `DashboardPage.tsx` reescrito al diseño (banner racha/nivel/objetivo+frase+CTA "Entrenar ahora"; 4 stat cards semanales: Progreso de Jugador con % a nivel siguiente —curva `FLOOR(100·nivel^1.5)`—, Meta de Sesiones, Quema Acumulada, Tiempo Activo; split 8/4: chart kcal Lun–Dom con "hoy" resaltado y promedio/día activo, "Sesión Recomendada de Hoy" con join ampliado de `rutinas` y CTA condicional por `rutina_id` (con fallback con ícono cuando no hay cover), "Recarga Post-Entreno" desde `recetas` (oculta si vacía — **hay 0 filas en prod**), "Tu Objetivo Activo", "Comunidad en Vivo" top-3 real desde `user_stats_public`+`perfiles_public` con fila propia resaltada; debajo, Últimas Sesiones/mini-calendario/historial restyleados). Omitidos por spec: Agenda, Desafíos, tabs mes, bpm/peso, campana/online/bookmark. `XPBar`/`WeeklyGoal`/`DashboardSkeleton` adaptados (solo se usan en Dashboard). Verificación: vitest focal **18/18 ✅**(spot check del orquestador) y full **178/178** (reporte del worker), consola sin errores nuevos, CTA real verificado en navegador (navega a `/rutinas/practicar/…`), visual desktop+móvil vs diseño (screenshots `t3-dash-desktop-final.png`, `t3-dash-mobile-final.png`).

**L7 (2026-10-13) — T1 ✅ Login:** `LoginPage.tsx` reescrito al diseño Stitch (split hero desktop con radial glow/orbs/badge campus/social proof/testimonial/footer; form con Google, divisor, labels uppercase, inputs `#111113` rounded-xl, CTA gradiente naranja, "Regístrate gratis", legal). Móvil: hero-card (badge Plan Estudiante + chip campus + h1 + subtítulo + avatares +2k), google, form, rating card 4.9/5, legal (adaptación del diseño móvil tipo modal: sin X/avatar). Checkbox "Recordar mi sesión" OMITIDO (no existe la funcionalidad; S6). Verificación: vitest LoginPage **6/6 ✅**; visual desktop 1280 + móvil 390 vs diseño (2 defectos corregidos: divisor en 1 línea alineado a la derecha, ancho móvil px-4); **login real contra PRODUCCIÓN** con cuenta E2E → redirect a `/dashboard` ✅. Test actualizado: "Regístrate gratis" + queries getAll para textos duplicados móvil/desktop. Screenshots: `t1-login-desktop-v2.png`, `t1-login-mobile-v2.png`, `t1-login-after-submit.png`.


**L8 (2026-10-13) — T9 ✅ Header/nav/footer compartido:** `PublicLayout.tsx` con header del diseño (h-16, `#0e0e0f`/90 + blur, logo Dumbbell+wordmark DaveFit, NavLinks en pills — activo `bg-[#ff5e00] text-[#531900]` —, avatar UserMenu redondo `#ffb599`/inicial, botones auth restyleados, hamburguesa móvil circular) + footer nuevo (`#0e0e0f`, logo + © 2025 DaveFit + links reales + 3 círculos decorativos) y contenedor main `max-w-7xl`. `NavLinks.tsx`, `UserMenu.tsx`, `MobileDrawer.tsx` restyleados al lenguaje del diseño. Cachet de la campana/anillo-online: OMITIDOS (sin sistema de notificaciones/presencia). Verificación: full suite **178/178 ✅** tras el cambio; visual desktop `/dashboard` (header pills + footer) y móvil `/biblioteca` (header compacto + drawer button) — screenshots `t9-dash-desktop.png`, `t9-biblio-desktop.png`, `t9-biblio-mobile.png`.


**L9 (2026-10-13) — T4 ✅ Biblioteca (delegado + verificación):** `BibliotecaPage.tsx` al diseño (header con título degradado, "Momento de Mentalidad" con quote aleatoria existente, panel búsqueda+filtros con chips scrollables móvil, grid 1/2/3, card con badge EJERCICIO/YOGA, duración, tags nivel/equipo y CTA "Probar Gratis →" conservando la navegación actual; empty state híbrido con copy del diseño + "Restablecer filtros" cuando hay filtros activos; catálogo vacío conserva copy legacy). Omitidos: banner "plan personalizado" (no existe), footer móvil (ya está el global), overlay de búsqueda móvil. Verificación: vitest focal **8/8 ✅** (spot check del orquestador; 1 test nuevo de reset, 7 originales intactos), full **179/179** (reporte worker), visual desktop+móvil vs refs (screenshots `t4-biblio-desktop-final.png`, `t4-biblio-mobile-final.png`), empty state verificado en vivo. Nota CSP dev: covers de prod bloqueadas por CSP local (pre-existente, fallback visual OK). Pulido del orquestador: "Iniciar Sesión" oculto en móvil del header público (evita wrap; el drawer ya lo tiene).


**L10 (2026-10-13) — T5 ✅ Nutrición/Recetas (delegado + verificación):** `NutritionPage.tsx` al diseño (título degradado + subtítulo, banner "Tip Pro DaveFit" estático, buscador, chips de dificultad, fila "Recetas Destacadas de la Semana" con contador + selector "Ordenar por" [Más recientes/Mayor proteína/Menor tiempo/Menos calorías, `useMemo` con columnas reales], grid 1/2/3, cards con pills duración/dificultad, barra de macros reales (4 celdas), CTA "Ver Receta Completa →" [el CTA anterior era un span SIN handler — conservado presentacional]). Omitidos: filtros "Objetivo:" (sin columna), badges de categoría, favoritos, Ctrl+K, "Comunidad Activa". Verificación: vitest focal **10/10 ✅** (spot check; +9 tests nuevos), full **188/188** (reporte worker), visual con datos mockeando fetch (cards) + empty real en prod (`t5-nutri-desktop-cards.png`, `t5-nutri-mobile-cards.png`, `t5-nutri-desktop.png`), consola 0 errores. **Limitación documentada: `recetas` tiene 0 filas en producción** → cards no verificables con datos reales sin sembrar (no se sembró).


**L11 (2026-10-13) — T6 ✅ Comunidad (delegado + verificación) + T9b bottom-nav móvil:** `ComunidadPage.tsx` al diseño (badge Temporada + hero, "Ranking histórico" + control Ordenar por Puntos/Racha/Sesiones con columnas reales, podio 2-1-3 con coronas, card motivacional + CTA, fila "Tú" con puesto real y progreso al Top 10 — estado "Top 10 asegurado" con <10 atletas —, Tabla de Atletas desde #4, y card "Muro de la Comunidad" embebiendo `SuggestionsSection` real con nueva prop `compact`). Omitidos: tabs de período, Desafíos, Torneo Interfacultades, feed de actividad falso, timestamps. Verificación: focal **10/10** + AcercaDe/Suggestions verdes (spot check 11/11), full **193/193** (reporte worker), visual desktop+móvil logueado (`t6-com-desktop.png`, `t6-com-mobile.png`), consola 0 errores. **Decisión a reportar al usuario:** el muro de sugerencias (antes solo en /acerca-de) ahora también vive en /comunidad (revertible con una línea). T9b: nuevo `MobileBottomNav.tsx` (Biblioteca/Nutrición/Comunidad/Perfil, patrón de todos los diseños móviles) montado en PublicLayout con `pb-16` móvil — verificado visualmente (`t9b-bottomnav.png`).


**L12 (2026-10-13) — T7 ✅ Perfil (delegado + verificación):** `ProfilePage.tsx` al diseño (breadcrumb "Perfil de Atleta/Nivel/nombre", H1 + subtítulo, acciones Descartar/Guardar; hero con avatar+cámara [flujo crop intacto], email, "Miembro desde" real, badges Racha/Rango/Meta reales; form "Datos Personales & Configuración" con los 8 campos reales del schema [nombre, nacimiento, género, peso, estatura, pills 1d–7d, nivel, objetivo]; "Métricas Metabólicas" BMR/TDEE con estado honesto "Completa tu perfil" cuando faltan datos base [la cuenta E2E no tiene fecha_nacimiento], tiles Peso/Altura/IMC reales; "Camino del Guerrero" con curva XP real [749/1118 → LVL 6]; consejo personalizado real; "Ver historial de progreso" → /dashboard). OMITIDOS por no existir: tabs/seguridad de cuenta, meta de peso/delta mensual, ID, plan, sync timestamps, Katch-McArdle. Cambio de patrón: form siempre visible (sin toggle Editar) — se reporta. Verificación: focal **5/5 ✅** (spot check), full **197/197** (reporte worker), visual desktop+móvil (`t7-perfil-desktop.png`, `t7-perfil-mobile.png`), guardado real con valores idénticos + toast verificado (`t7-perfil-save-toast.png`), consola 0 errores. Nota: worker sanó en caliente el optimizer de Vite del dev server (504 "Outdated Optimize Dep" pre-existente en /perfil).


**L13 (2026-10-13) — T8 ✅ Coach IA (delegado + verificación):** `CoachPage.tsx` al diseño (cabecera con cuota real `7/10 disponibles` + barra + próximo reinicio; panel "Contexto Activo" real: nombre, nivel, racha 12d, meta, TDEE/BMR honestos "—" sin datos base, peso real; "Capacidades del Motor" estático; chat 2 columnas con burbujas, chips de sugerencias que rellenan el input sin consumir cuota, botón limpiar conversación local; disclaimer de privacidad; banner de racha real con CTA). Contrato del chat INTACTO: POST `/api/coach` + Bearer/CSRF, cuota/429/rollback, markdown sanitizado + typewriter/aria-busy/autoscroll, testids exactos. Verificación: focal **10/10 ✅** (spot check), full **200/200** (reporte worker), **e2e coach 2/2 ✅** (18.8s, ejecutado tras el rediseño), visual desktop+móvil (`t8-coach-desktop.png`, `t8-coach-mobile.png`), consola 0 errores. Nota: la cuota de la cuenta E2E quedó en 0/10 (el propio test la agota a propósito — precondición documentada).


**L14 (2026-10-13) — T10 ✅ Verificación final + Judgment Day APPROVED:** Suite completa **200/200 ✅**; e2e home **2/2**, dashboard **1/1** (spec actualizado al dashboard nuevo + fixtures de recetas/comunidad), coach e2e **2/2** (corrida fresca post-T8; su cuota quedó 0/10 por diseño del propio test); barrido visual final de las 8 páginas × desktop/móvil (`final-*.png`, 16 capturas) revisado. **Judgment Day formal:** R1 (2 jueces ciegos; A limpio, B con 1 CRITICAL + 2 HIGH + 3 WARNING) → triaje: CRITICAL `.env.production` es PRE-EXISTENTE (decisión de deploy del usuario, fuera de alcance); 2 HIGH + 3 WARNING reparados por el orquestador (regex e2e saludo 00–12h; auto-scroll de ventana en /coach; singular "1 días"; queries acotadas del widget comunidad; fila "Mostrando N / Limpiar filtros" restaurada) → R2 scoped (ambos jueces coinciden: mi fix introdujo un `ref` duplicado en CoachPage, regresión del follow-scroll del typewriter + error tsc) → fix correcto (un solo `ref={scrollContainerRef}`) → R3 scoped final: **AMBOS JUECES LIMPIOS — JUDGMENT: APPROVED ✅**. Evidencia post-fix: vitest 200/200, tsc sin errores nuevos en CoachPage, live scrollY=0, widget comunidad con top-3 real acotado.

**Pendientes/decisiones para el usuario:**
- `.env.production` + `Dockerfile` siguen modificados sin commitear (decisión de deploy; NO tocar).
- Página `/rutinas` (Mis Rutinas) NO tiene pantalla Stitch → quedó sin rediseño (su contenido vive dentro del layout nuevo).
- Tabla `recetas` vacía en prod → /nutricion muestra empty state; sección "Recarga" del dashboard oculta.
- Muro de sugerencias ahora también visible en /comunidad (decisión reversible de 1 línea si no se desea).
- Cuota del Coach de la cuenta E2E en 0/10 (agotada por los tests e2e; se renueva sola).
- Sin commits/push (pedido explícito del usuario): todo vive en el working tree.
