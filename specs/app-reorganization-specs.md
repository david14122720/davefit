# SDD: Especificaciones Detalladas — Reorganización DaveFit

**Basado en**: Proposal `sdd/app-reorganization/proposal` (mem #253) + Exploración `sdd/app-reorganization/explore` (mem #252)
**Estado**: Specs para implementación
**Cambios**: 8

---

## Cambio 1: BibliotecaPage — Página pública de Biblioteca

### Descripción
Nueva página `/biblioteca` dentro de la SPA React (no Astro), accesible SIN autenticación. Unifica ejercicios y yoga en un solo catálogo público. Funciona como landing de entrada para usuarios no logueados.

### Requisitos funcionales
1. Ruta `/biblioteca` dentro del Router de React (App.tsx), SIN `ProtectedRoute`.
2. Fetch de rutinas de ejercicios (`rutinas` table) y rutinas de yoga (`yoga_rutinas` table) en paralelo.
3. Grid responsivo de tarjetas (1/2/3 columnas según viewport).
4. Filter chips por tipo: **Todos**, **Fuerza**, **Cardio**, **Yoga**, **Flexibilidad**, **Relajación**.
5. Cada tarjeta mustra: nombre, tipo (badge), duración, dificultad (nivel), imagen de cover.
6. Click en tarjeta de ejercicio → navega a `/rutinas/practicar/:id` (WorkoutPracticePage).
7. Click en tarjeta de yoga → navega a `/yoga/practicar/:id` (YogaPracticePage).
8. Skeleton loading con shimmer (mismo patrón que RoutinesPage).
9. Animaciones de entrada con framer-motion (stagger children, fade+slide up).
10. Estado vacío con mensaje amigable si no hay rutinas disponibles.

### Requisitos visuales
- Inspiración Stitch "Kinetic Pulse": dark mode profundo (`#0a0a0a` bg), acento naranja (`#FF6B00`).
- No-Line rule: sin bordes en tarjetas, separación por contrastes de fondo (`#0a0a0a` → `#111111` → `#141414`).
- Glassmorphism en contenedores de filtros: `bg-white/5 backdrop-blur-xl border border-white/10`.
- Space Grotesk para headers, Inter para body.
- Tarjetas con hover: `hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]`.
- Filter chips: mismo estilo que YogaPage/NutritionPage (botones compactos con iconos, gradientes de color por tipo).
- Skeleton loading: bloques `bg-white/5` con `animate-pulse`.

### Requisitos de datos

```typescript
// Rutinas de ejercicios (públicas)
const { data: rutinas } = await insforge.database
  .from('rutinas')
  .select('*')
  .eq('es_publica', true)  // asumiendo campo exists
  .order('created_at', { ascending: false });

// Rutinas de yoga (públicas)
const { data: yogaRutinas } = await insforge.database
  .from('yoga_rutinas')
  .select('*, posiciones:yoga_rutinas_posiciones(*)')
  .order('created_at', { ascending: false });
```

Se unifican en un solo array con un discriminador `tipo: 'ejercicio' | 'yoga'`.

### Casos borde
- **Sin datos**: Mostrar estado vacío con icono y mensaje "No hay rutinas disponibles por ahora".
- **Error de conexión**: Mostrar pantalla de error con botón "Reintentar" (como NutritionPage).
- **IDs inválidos en links**: Si una tarjeta tiene ID que no existe al navegar, las páginas de práctica ya manejan error state.
- **Refresh de página**: La ruta funciona directamente por el catch-all `[...slug].astro`.
- **Payload grande**: Implementar paginación simple si hay más de 50 items (usar range-based).

### Archivos involucrados
- **CREAR**: `src/app/pages/BibliotecaPage.tsx`
- **MODIFICAR**: `src/app/App.tsx` — agregar ruta `/biblioteca` sin ProtectedRoute, lazy import
- **MODIFICAR**: `src/app/components/AppLayout.tsx` — agregar nav item Biblioteca (ver cambio 5)

---

## Cambio 2: Práctica pública — WorkoutPracticePage + YogaPracticePage sin login

### Descripción
Ambas páginas de práctica deben funcionar sin sesión iniciada. Usuarios anónimos pueden realizar la rutina completa, pero no se guarda progreso en DB. Usuarios logueados mantienen comportamiento actual.

### Requisitos funcionales
1. Quitar `ProtectedRoute` de las rutas `/rutinas/practicar/:rutinaId` y `/yoga/practicar/:rutinaId`.
2. En `saveToHistory` (WorkoutPracticePage): si `!user`, saltar el guardado en DB y skip de XP.
3. En `handleFinalizar` (YogaPracticePage): si `!user`, saltar `processWorkoutCompletion` y no guardar.
4. El completion modal se muestra igual en ambos casos, pero sin sección de XP si no hay user.
5. Los botones de "Volver" deben apuntar a `/biblioteca` (no a `/rutinas` o `/yoga`).
6. Mantener el timer, ejercicios, navegación, y toda la UX funcionando sin auth.
7. YogaContext: asegurar que `startSession`, `completeSession` no fallen sin user (revisar flujo).

### Requisitos visuales
- Sin cambios visuales. Mantener el diseño actual (estilo "militar táctico" en Workout, estilo zen en Yoga).
- Solo cambiar textos de botones de retorno: "Biblioteca" en vez de "Rutinas"/"Yoga".

### Requisitos de datos
- WorkoutPracticePage ya carga `rutinas` y `rutinas_ejercicios` desde InsForge (público, no requiere auth por RLS).
- YogaPracticePage carga desde YogaContext (misma situación).
- Solo los writes a `historial_entrenamientos` y `processWorkoutCompletion` requieren user.

### Casos borde
- **Usuario anónimo completa rutina**: Modal de finalización se muestra sin XP, botón "Volver a Biblioteca".
- **Usuario logueado**: Flujo normal con XP, level up, y guardado en historial.
- **Conexión perdida durante práctica**: El timer sigue corriendo, al finalizar no se guarda (silent fail).
- **Recarga de página**: Timer se pierde (comportamiento actual), se reinicia desde 0.

### Archivos involucrados
- **MODIFICAR**: `src/app/App.tsx` — quitar ProtectedRoute de rutas de práctica
- **MODIFICAR**: `src/app/pages/WorkoutPracticePage.tsx` — condicional `if (user)` en saveToHistory, cambiar link de retorno
- **MODIFICAR**: `src/app/pages/YogaPracticePage.tsx` — condicional `if (user)` en handleFinalizar, cambiar link de retorno
- **REVISAR**: `src/app/context/YogaContext.tsx` — flujo completeSession sin user

---

## Cambio 3: DashboardPage unificado — Hub tipo dashboard con secciones

### Descripción
Una sola página protegida `/dashboard` que reemplaza las páginas separadas de perfil, historial y dashboard actual. Secciones scrollables tipo hub.

### Requisitos funcionales
1. Ruta protegida `/dashboard` (existente, mantener `ProtectedRoute`).
2. **Sección 1 — Resumen/Stats**: Contenido actual del DashboardPage (XPBar, WeeklyGoal, stats cards, frecuencia semanal, quick resume).
3. **Sección 2 — Perfil**: Info personal (nombre, email, avatar, objetivo, nivel, preferencias), botón "Editar Perfil" que abre modal o navega a página de edición (preservar lógica de ProfilePage actual).
4. **Sección 3 — Historial**: Actividad reciente con lista de entrenamientos completados (fecha, duración, calorías, nombre de rutina), enlace para ver historial completo.
5. Scroll suave entre secciones con `scroll-mt-20` y sticky section headers.
6. Navegación interna con anchor links (botones tipo tabs: "Resumen", "Perfil", "Historial").
7. Preservar funcionalidad actual de XP, WeeklyGoal, TimeSelector, y reanudación de rutina.
8. Estado de carga con skeleton (ya implementado).

### Requisitos visuales
- Misma línea visual que el Dashboard actual (bg `#0a0a0a`, tarjetas `#141414`).
- Section headers con icono + título + divider sutil.
- Tabs de navegación horizontal sticky debajo del header principal.
- Glassmorphism en las tabs: `bg-[#141414]/80 backdrop-blur-xl border border-white/10`.
- Scroll suave con `scroll-behavior: smooth` y `scroll-mt-24`.
- Perfil: avatar circular grande (120px), información en grid 2-columnas.
- Historial: items compactos con icono, fecha, duración, calorías.

### Requisitos de datos
```typescript
// Stats (ya existen)
const [historial, rutinas, ejercicios, datosTotales] = await Promise.all([...]);

// Perfil (desde AuthContext)
const { user, perfil } = useAuth();

// Historial completo (mejorar query actual)
const { data: historial } = await insforge.database
  .from('historial_entrenamientos')
  .select('*, rutinas(nombre)')
  .eq('usuario_id', user.id)
  .order('fecha', { ascending: false })
  .limit(20);
```

### Casos borde
- **Usuario sin perfil completo**: Mostrar placeholder "Completa tu perfil" con botón para editar.
- **Sin historial**: Estado vacío en sección de historial con CTA a Biblioteca.
- **Carga parcial**: Cada sección maneja su propio estado de carga.
- **Navegación directa por URL**: `/dashboard#perfil` scrollea directo a sección.
- **Transición desde ProfilePage/HistoryPage**: Los redirects existentes (ver cambio 8) llevan a `/dashboard`.

### Archivos involucrados
- **MODIFICAR**: `src/app/pages/DashboardPage.tsx` — agregar secciones Perfil e Historial
- **MODIFICAR**: `src/app/App.tsx` — quitar rutas `/perfil` e `/historial` (o redirect)
- **ELIMINAR** (opcional): `src/app/pages/ProfilePage.tsx` si no se reusa
- **ELIMINAR** (opcional): `src/app/pages/HistoryPage.tsx` si no se reusa

---

## Cambio 4: Index.astro → Acerca de (About Page)

### Descripción
La landing page actual (`/`) se transforma en una página "Acerca de" que mantiene las sugerencias y añade información institucional de DaveFit. El hero y CTAs se redirigen a la nueva Biblioteca pública.

### Requisitos funcionales
1. Mantener sección de sugerencias (formulario + listado de comunidad) — funcionalidad existente.
2. Agregar sección "Nuestra Misión" (contenido actual de la mission section).
3. Agregar sección "Equipo" o "Cómo funciona" (pasos actualizados).
4. Cambiar hero CTAs:
   - "Comenzar gratis" → apunta a `/register` (mantener).
   - "Ver demo" → apunta a `/biblioteca` (cambio de `#como-funciona`).
   - Hero tagline: ajustar a tono más institucional.
5. Links internos actualizados:
   - Navegación en BaseLayout: "Iniciar Sesión" → `/login`, "Registro" → `/register`.
   - Footer: link "Sobre Nosotros" (self, `/`), "FAQ" (`/faq`), "Contacto".
   - Sección "Beneficios": CTA a `/biblioteca` con `data-astro-reload`.
6. Mantener SSR y fetch de datos actual (suggestions, stats).
7. Añadir metadata SEO apropiada (title + description).

### Requisitos visuales
- Mismo diseño actual (dark, naranja, blur effects, gradientes).
- Hero simplificado: sin imagen de fondo pesada, más minimalista.
- Sección de misión expandida con datos de equipo/visión.
- Sugerencias igual que hoy (formulario + listado).

### Requisitos de datos
- Mantener queries existentes: `suggestions` (aprobadas), `site_stats`.
- No agregar nuevas queries.

### Casos borde
- **Error de conexión**: Mantener pantalla de error actual (Sobrecarga en la Base).
- **Sin sugerencias**: Estado vacío "Sé el primero en dar una sugerencia".
- **Navegación SPA → Astro page**: Usar `data-astro-reload` en links entre Astro y SPA.
- **Redirect de / → /biblioteca para usuarios no logueados**: No hacer redirect automático, mantener `/` como institucional.

### Archivos involucrados
- **MODIFICAR**: `src/pages/index.astro` — cambiar hero, CTAs, agregar contenido institucional
- **MODIFICAR**: `src/layouts/BaseLayout.astro` — actualizar links de navegación (Biblioteca)
- **CREAR** (opcional): `src/pages/about.astro` si se prefiere separar (o mantener en `/`)

---

## Cambio 5: Navbar/AppLayout actualizado

### Descripción
Reestructurar la navegación principal (sidebar desktop + bottom nav mobile) para reflejar la nueva arquitectura: menos items, más limpia, con Biblioteca como primera opción.

### Requisitos funcionales
1. Sidebar (`AppLayout.tsx`) nueva estructura:
   - **Biblioteca** → `/biblioteca` (público)
   - **Nutrición** → `/nutricion` (protegido, mantener)
   - **Acerca de** → `/` (público, link externo con `target` o navigate)
   - **Dashboard** → `/dashboard` (protegido, solo visible con sesión)
   - Sección Admin se mantiene igual.
2. Sin sesión: solo mostrar Biblioteca, Nutrición, Acerca de + botones Login/Register.
3. Con sesión: mostrar Biblioteca, Nutrición, Acerca de, Dashboard + avatar+nombre+cerrar sesión.
4. Bottom nav mobile: primeros 3-4 items (Biblioteca, Nutrición, Dashboard si sesión, Acerca de).
5. Quitar items: Yoga, Rutinas, Comunidad, Perfil, Historial como ítems separados.
6. Login/Register: en sidebar cuando no hay sesión (links estilizados).

### Requisitos visuales
- Misma línea visual que AppLayout actual (sidebar `#0d0d0d`, active state orange).
- Biblioteca con icono de libro/explorar, Dashboard con icono de grid.
- Nutrición mantiene icono actual.
- Acerca de con icono de info/círculo.
- Login/Register: botones estilizados, no solo links de texto.
- Avatar footer: mantener diseño actual.

### Requisitos de datos
- `useAuth()` para detectar `user` y `isAdmin`.

### Casos borde
- **Usuario no logueado navega a /nutricion**: ProtectedRoute redirige a `/login`, post-login redirige de vuelta (react-router).
- **Click en Acerca de** → navega a `/` que es página Astro → `window.location.href = '/'`.
- **Mobile**: Bottom nav se adapta dinámicamente según sesión.
- **Admin**: Sección admin se mantiene bajo toggle, no cambia.

### Archivos involucrados
- **MODIFICAR**: `src/app/components/AppLayout.tsx` — reestructurar navItems, condicionales según user

---

## Cambio 6: Mejora visual Login/Register

### Descripción
Actualizar el diseño visual de Login y Register con glassmorphism, sombras más profundas, y la nueva línea visual "Kinetic Pulse". Sin cambios de funcionalidad, validación, o flujo.

### Requisitos funcionales
1. Mismo formulario, mismo schema Zod, mismos campos.
2. Misma validación con react-hook-form + zod.
3. Mismo flujo: submit → signIn/signUp → redirect o error.
4. Misma integración con Google OAuth.
5. Solo cambios de estilo visual.

### Requisitos visuales
- Glassmorphism en contenedor principal: `bg-[#141414]/60 backdrop-blur-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.5)]`.
- Fondo con blur orbs más intensos y animados (naranja + púrpura).
- Inputs con glow en focus: `focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50`.
- Logo más prominente con text-shadow glow.
- Botón submit con hover más suave y shadow glow.
- Divider "O continúa con" más elegante (gradiente en línea).
- Enlace de registro/login con hover underline + color transition.
- Animación de entrada: fade+slide up con framer-motion (ya existe, mejorar timing).

### Requisitos de datos
- Sin cambios. Mismos endpoints, mismos providers.

### Casos borde
- Sin cambios. Mantener manejo de errores, loading states, success states.

### Archivos involucrados
- **MODIFICAR**: `src/app/pages/LoginPage.tsx` — solo estilos CSS/Tailwind
- **MODIFICAR**: `src/app/pages/RegisterPage.tsx` — solo estilos CSS/Tailwind

---

## Cambio 7: Mejora visual Nutrición

### Descripción
Actualizar diseño visual de NutritionPage y NutritionDetailPage para alinearse con la línea visual "Kinetic Pulse". Sin cambios de funcionalidad.

### Requisitos funcionales
1. Misma búsqueda, filtros, grid, y navegación a detalle.
2. Misma carga de datos desde InsForge.
3. Misma estructura de componentes.
4. Solo cambios visuales.

### Requisitos visuales
- Alinear con BibliotecaPage y YogaPage en términos de:
  - Glassmorphism en contenedor de filtros.
  - Hover effects en tarjetas (mismos que Biblioteca).
  - Skeleton loading consistente.
  - Tipografía Space Grotesk (headers) + Inter (body).
  - Badges de dificultad consistentes.
- Mejorar transiciones: stagger en grid items.
- Mejorar imagen de tarjeta (cover con overlay gradient en hover).
- Agregar micro-animaciones en iconos.

### Requisitos de datos
- Sin cambios. Mismas queries a `recetas`.

### Casos borde
- Sin cambios. Mantener manejo de errores, estados vacíos.

### Archivos involucrados
- **MODIFICAR**: `src/app/pages/NutritionPage.tsx` — solo estilos
- **MODIFICAR**: `src/app/pages/NutritionDetailPage.tsx` — solo estilos

---

## Cambio 8: Eliminar rutas obsoletas

### Descripción
Eliminar páginas y rutas que ya no tienen sentido en la nueva estructura. Reemplazar con redirects a las nuevas ubicaciones.

### Requisitos funcionales
1. `/yoga` → redirect a `/biblioteca`
2. `/perfil` → redirect a `/dashboard`
3. `/historial` → redirect a `/dashboard`
4. `/yoga/posiciones` → redirect a `/biblioteca` (o eliminar)
5. Quitar lazy imports y archivos de: YogaPage, YogaPosicionesPage, ProfilePage, HistoryPage (si no se reutilizan en Dashboard).
6. Mantener YogaPracticePage y WorkoutPracticePage (se reutilizan desde Biblioteca).
7. Mantener rutas admin sin cambios.

### Requisitos visuales
- N/A. Son redirects o eliminaciones.

### Requisitos de datos
- N/A.

### Casos borde
- **Usuario con bookmark viejo**: Redirect automático a la nueva ubicación.
- **Backend/admin references**: Verificar que no haya links internos a estas rutas en el código (además de AppLayout que ya se actualiza en cambio 5).

### Archivos involucrados
- **MODIFICAR**: `src/app/App.tsx` — cambiar rutas obsoletas a `<Navigate to="/biblioteca" replace />` o `<Navigate to="/dashboard" replace />`
- **MODIFICAR**: `src/app/App.tsx` — quitar lazy imports de páginas eliminadas
- **ELIMINAR** (si no se reusan en Dashboard): `src/app/pages/YogaPage.tsx`, `YogaPosicionesPage.tsx`, `ProfilePage.tsx`, `HistoryPage.tsx`
- **MODIFICAR**: `src/app/context/YogaContext.tsx` — verificar que se pueda usar sin YogaPage (YogaPracticePage lo necesita)

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `src/app/pages/BibliotecaPage.tsx` | **CREAR** |
| `src/app/pages/DashboardPage.tsx` | **MODIFICAR** — agregar secciones perfil + historial |
| `src/app/pages/WorkoutPracticePage.tsx` | **MODIFICAR** — quitar auth requirement, cambiar links |
| `src/app/pages/YogaPracticePage.tsx` | **MODIFICAR** — quitar auth requirement, cambiar links |
| `src/app/pages/LoginPage.tsx` | **MODIFICAR** — solo estilos |
| `src/app/pages/RegisterPage.tsx` | **MODIFICAR** — solo estilos |
| `src/app/pages/NutritionPage.tsx` | **MODIFICAR** — solo estilos |
| `src/app/pages/NutritionDetailPage.tsx` | **MODIFICAR** — solo estilos |
| `src/app/App.tsx` | **MODIFICAR** — rutas nuevas, redirects, lazy imports |
| `src/app/components/AppLayout.tsx` | **MODIFICAR** — nueva navbar |
| `src/app/components/ProtectedRoute.tsx` | **REVISAR** — posible refactor menor |
| `src/pages/index.astro` | **MODIFICAR** — hero, CTAs, contenido institucional |
| `src/layouts/BaseLayout.astro` | **MODIFICAR** — links de navegación |
| `src/app/pages/YogaPage.tsx` | **ELIMINAR** |
| `src/app/pages/YogaPosicionesPage.tsx` | **ELIMINAR** |
| `src/app/pages/ProfilePage.tsx` | **ELIMINAR** (o mantener si reusado en Dashboard) |
| `src/app/pages/HistoryPage.tsx` | **ELIMINAR** (o mantener si reusado en Dashboard) |

## Notas de implementación

1. **Orden sugerido**: Cambio 5 (navbar) → Cambio 1 (Biblioteca) → Cambio 2 (práctica pública) → Cambio 8 (redirects) → Cambio 3 (Dashboard) → Cambios 4, 6, 7 en paralelo.
2. **Riesgo medio-alto**: El cambio 3 (Dashboard unificado) es el más complejo por la integración de datos y UI.
3. **Testing**: Probar flujo completo anónimo: landing (/biblioteca) → elegir rutina → practicar → completar → volver. Luego flujo logueado: login → dashboard → practicar → XP.
4. **SEO**: La página `/biblioteca` siendo SPA no es indexable dinámicamente. Considerar pre-rendering o SSR futuro.
