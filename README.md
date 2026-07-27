# DaveFit

Plataforma de entrenamiento inteligente para estudiantes. Construida con **Astro 7** + **React 19 SPA** + **Tailwind CSS 4** + **InsForge** (backend).

## Stack

| Tecnología | Versión |
|---|---|
| Astro | ^7.1.4 |
| React | ^19.2.4 |
| Tailwind CSS | ^4.3.3 |
| InsForge SDK | ^1.1.2 |
| Vite (bundled) | 8.x |
| Node.js | 20+ |

## Inicio Rápido

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # Producción SSR → dist/
npm run preview  # Vista previa del build
npx vitest run   # Tests unitarios
npx playwright test  # Tests E2E
```

Configura `.env`:
```env
PUBLIC_INSFORGE_URL=https://tu-backend.insforge.app
PUBLIC_INSFORGE_ANON_KEY=tu-clave
```

## Arquitectura

```
/              → Landing page (Astro SSR)
/app/*         → App React SPA (React Router, lazy loading)
/about, /faq   → Páginas estáticas Astro
```

### Estructura

```
src/
├── app/                          # React SPA
│   ├── App.tsx                   # Router con React.lazy() + Suspense
│   ├── context/AuthContext.tsx   # Auth global (login, logout, perfil)
│   ├── components/               # Componentes compartidos
│   │   ├── AppLayout.tsx         # Sidebar + navbar
│   │   ├── ProtectedRoute.tsx    # Guard de rutas
│   │   ├── ErrorBoundary.tsx     # Manejo de errores
│   │   └── Skeleton.tsx          # Skeletons + loaders
│   └── pages/                    # Páginas lazy-loaded
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx     # Centro de control personal
│       ├── ProfilePage.tsx
│       ├── NutritionPage.tsx
│       ├── RoutinesPage.tsx
│       └── ...
├── pages/                        # Astro pages
│   ├── index.astro               # Landing
│   ├── faq.astro
│   └── app/[...slug].astro       # Shell SPA
├── lib/                          # Lógica de negocio
│   ├── insforge.ts               # Cliente InsForge singleton
│   ├── auth.ts                   # Sanitización, CSRF, rate-limit
│   ├── db.ts                     # queryWithRetry, getById
│   ├── stats.ts                  # Stats + leaderboard
│   ├── gamification.ts           # XP, rachas, niveles
│   └── nutrition.ts              # BMR/TDEE/IMC
├── middleware.ts                  # CSP, CSRF, security headers
├── types/index.ts                # Tipos centralizados del dominio
├── constants/index.ts            # Constantes globales
└── styles/global.css             # Tailwind v4 @theme + utilidades
```

## Roles

- **Usuario**: Dashboard, Rutinas, Perfil, Historial, Comunidad
- **Admin**: + Panel de administración (`/admin/*`)

## Rendimiento

- **Code Splitting**: `React.lazy()` en todas las rutas — bundles bajo demanda
- **Tailwind v4**: Compilación nativa, zero runtime, `@theme` tokens CSS
- **Memoización**: `React.memo()`, `useMemo`, `useCallback` en componentes críticos
- **Image Optimization**: Astro `<Image />` con webp automático

## Seguridad

- **CSP**: Content-Security-Policy estricto via middleware
- **CSRF**: Double-submit cookie pattern en mutaciones `/api/*`
- **Headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- **Sanitización**: `sanitizeText()` para input de usuarios
- **Rate limiting**: Por IP en operaciones sensibles
- **Trusted proxies**: `security.allowedDomains` para X-Forwarded-Host

## Optimizaciones de Rendimiento
Para combatir la carga inicial de archivos grandes y hacer que la transición entre "apartados" de la aplicación sea instantánea o amigable:

- **Code Splitting (Lazy Loading)**: Implementado en el enrutador de React (`App.tsx`) mediante `React.lazy()` y `Suspense`. Esto divide el bundle masivo inicial generado por Vite en pequeños fragmentos JavaScript, los cuales solo se descargan y procesan al momento exacto en el que el usuario va a visitar una ruta, acortando tiempos y eliminando bloqueos de rendering.
- **Componente <Image /> de Astro**: Se modificaron las imágenes para usar la optimización nativa del motor de Astro en las *landing pages*, cargando automáticamente el formato webp comprimido en lugar de imágenes originales gigantes en megabytes. 
- **Memoización con `useMemo`**: Utilizado en el derivado del cálculo del tablero (dashboard) para no iterar los números cada vez que React re-renderiza el componente al recibir retroalimentación visual o de mouse.
- *Nota sobre peso en Entorno de Desarrollo*: Si se percibe un peso inusualmente grande en la pestaña *Network* (ej. 15MB) durante el desarrollo local, es el comportamiento normal y esperado de **Vite** cuando mapea todo el código original sin ofuscar ni minificar para ofrecer recarga en vivo (Hot Module Reload). Al construir para producción (`npm run build`), el proyecto pesará mínimos kilobytes de datos procesados.
