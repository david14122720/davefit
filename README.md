# DaveFit

Plataforma de entrenamiento inteligente para estudiantes. Construida con **Astro** (páginas estáticas) + **React SPA** (app interactiva) + **InsForge** (backend).

## Inicio Rápido

```bash
npm install
npm run dev
```

Configura `.env`:
```env
PUBLIC_INSFORGE_URL=https://tu-backend.insforge.app
PUBLIC_INSFORGE_ANON_KEY=tu-clave
```

## Arquitectura

- **`/`** → Landing page (Astro, estático/SSR)
- **`/app/*`** → App React SPA (cliente routing con React Router)
- **`/about`**, **`/faq`** → Páginas estáticas Astro

### Estructura

```
src/
├── app/
│   ├── App.tsx              # Router principal
│   ├── context/
│   │   └── AuthContext.tsx  # Auth global (login, logout, perfil)
│   ├── components/
│   │   ├── AppLayout.tsx    # Sidebar + navbar
│   │   └── ProtectedRoute.tsx
│   └── pages/               # Páginas React
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx
│       └── ...
└── pages/
    ├── index.astro          # Landing
    ├── about.astro
    └── app/[...slug].astro  # Shell que renderiza App.tsx
```

## Roles

- **Usuario**: Dashboard, Rutinas, Perfil, Historial
- **Admin**: + Panel de administración (cambiar rol a `admin` en tabla `perfiles`)

## Optimizaciones de Rendimiento
Para combatir la carga inicial de archivos grandes y hacer que la transición entre "apartados" de la aplicación sea instantánea o amigable:

- **Code Splitting (Lazy Loading)**: Implementado en el enrutador de React (`App.tsx`) mediante `React.lazy()` y `Suspense`. Esto divide el bundle masivo inicial generado por Vite en pequeños fragmentos JavaScript, los cuales solo se descargan y procesan al momento exacto en el que el usuario va a visitar una ruta, acortando tiempos y eliminando bloqueos de rendering.
- **Componente <Image /> de Astro**: Se modificaron las imágenes para usar la optimización nativa del motor de Astro en las *landing pages*, cargando automáticamente el formato webp comprimido en lugar de imágenes originales gigantes en megabytes. 
- **Memoización con `useMemo`**: Utilizado en el derivado del cálculo del tablero (dashboard) para no iterar los números cada vez que React re-renderiza el componente al recibir retroalimentación visual o de mouse.
- *Nota sobre peso en Entorno de Desarrollo*: Si se percibe un peso inusualmente grande en la pestaña *Network* (ej. 15MB) durante el desarrollo local, es el comportamiento normal y esperado de **Vite** cuando mapea todo el código original sin ofuscar ni minificar para ofrecer recarga en vivo (Hot Module Reload). Al construir para producción (`npm run build`), el proyecto pesará mínimos kilobytes de datos procesados.
