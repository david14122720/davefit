# Guía de Despliegue Universal en Dokploy

Esta guía describe el proceso general para desplegar cualquier proyecto en el servidor de Dokploy dentro de la red local.

## ℹ️ Información del Servidor
- **IP del Servidor**: `192.168.101.133`

## 🚀 Pasos para el Despliegue

### 1. Preparación en GitHub
- El código debe estar subido a un repositorio de GitHub.
- No utilizar Git manual; usar la integración nativa de **GitHub** en Dokploy para mayor facilidad y automatización.
- Asegurarse de que el repositorio tenga un `Dockerfile` configurado o sea compatible con el autodescubrimiento de Dokploy.

### 2. Configuración de la Aplicación
1.  **Crear Elemento**: En el panel de Dokploy, crear una nueva **Application**.
2.  **Fuente (Source)**: Seleccionar **GitHub**.
3.  **Vincular Repositorio**: Elegir el repositorio del proyecto y la rama (usualmente `main`).
4.  **Tipo de Construcción (Build Mode)**: 
    - Seleccionar **Dockerfile** si el proyecto tiene uno.
    - Seleccionar **Nixpacks** si quieres que Dokploy detecte el lenguaje automáticamente.

### 3. Configuración de Red (Puertos) ⚠️
Esta es la parte más importante para que el proyecto sea accesible desde otros PCs de la red. En la sección de **Ports**, configurar lo siguiente de forma manual:

| Campo | Configuración | Descripción |
| :--- | :--- | :--- |
| **Published Port** | `[TU_ELECCIÓN]` | El puerto que tú decidas (ej: 8085, 9000, etc.) |
| **Published Port Mode** | **Host** | **Obligatorio** para acceso por IP directa. |
| **Target Port** | `[INTERNO]` | El puerto que usa la app dentro (ej: 80 para Nginx). |
| **Protocol** | `TCP` | Estándar para aplicaciones web. |

> **DaveFit en vivo**: `Published Port 8083` (host) → `Target Port 80` (contenedor, nginx), con `autoDeploy` desactivado y sin dominios asociados.

### 4. Acceso Final
Una vez realizado el despliegue, la aplicación será accesible en:
`http://192.168.101.133:[TU_PUERTO]`

---

## 📋 Notas para Aplicaciones Go

Al desplegar aplicaciones Go en Dokploy, tener en cuenta los siguientes puntos importantes:

### go.mod y go.sum
- **go.mod**: Debe especificar una versión de Go que exista en Docker Hub. Usar `go 1.25.0` o inferior según la imagen base.
- **go.sum**: **Es obligatorio** incluir este archivo en el repositorio. Sin él, el build fallará al hacer `COPY go.mod go.sum ./`.

### Dockerfile para Go con CGO
Si la aplicación usa CGO (necesario para FFmpeg u otras librerías C), el Dockerfile debe incluir:
```dockerfile
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git ffmpeg gcc musl-dev linux-headers
```

### Errores comunes
1. **`go.sum: not found`**: Agregar `go.sum` al repositorio.
2. **`go.mod requires go >= 1.25.0 (running go 1.21)`**: Actualizar la versión de Go en el Dockerfile.
3. **`gcc not found`**: Agregar `gcc musl-dev linux-headers` al comando `apk add`.

### Notas adicionales
- Usar imágenes `alpine` para reducir tamaño.
- Para aplicaciones con FFmpeg, incluirlo tanto en el builder como en runtime.
- Verificar que el puerto expuesto coincida con el configurado en Dokploy.

---

## 📋 Notas para Aplicaciones SPA (React/Vue/Svelte en Astro)

Al desplegar aplicaciones de página única (SPA) dentro de Astro, el servidor debe responder a rutas como `/dashboard` o `/login`, que no corresponden a ningún fichero físico del build.

### El Problema
- Si el servidor intenta resolver `/dashboard` como un fichero (`dist/dashboard.html`), ese fichero no existe
- El resultado es un **404** al acceder directamente a rutas SPA (aunque la app funcione al navegar desde dentro)

### Cómo lo resuelve DaveFit (arquitectura real)

| Componente | Configuración |
| :--- | :--- |
| Render | SSR de Astro (`output: 'server'`) con adapter `@astrojs/node` en modo `standalone` |
| Shell SPA | Catch-all en la raíz: `src/pages/[...slug].astro` → `<App client:only="react"/>` |
| Proxy | `nginx.conf` del contenedor: `proxy_pass http://127.0.0.1:1412` |
| Puerto Node | `PORT=1412` (Dockerfile); nginx escucha en el `80`, que es el que Dokploy publica |
| Rutas React | Declaradas en `src/app/App.tsx` **sin prefijo** `/app`: `/biblioteca`, `/login`, `/dashboard`, `/rutinas`, `/admin`, … |

Flujo de una petición directa a `http://<IP>:8083/dashboard`:

1. Dokploy publica el puerto de host `8083` hacia el puerto `80` del contenedor.
2. nginx recibe la petición y la deriva a `http://127.0.0.1:1412` (servidor SSR de Astro).
3. Astro no coincide con ninguna ruta estática y responde con `src/pages/[...slug].astro`.
4. El shell carga `App.tsx`, que resuelve `/dashboard` con React Router.

No existe `src/pages/app/`: el catch-all vive en la raíz de `src/pages/`. Astro da prioridad a las rutas estáticas (`index.astro`, `about.astro`, `faq.astro`) y a los endpoints de `src/pages/api/`, así que solo los caminos no estáticos llegan al catch-all.

### Alternativas genéricas

#### Opción A: nginx con fallback al fichero del shell (alternativa genérica — no es la de DaveFit)

Si el build genera HTML estático, reescribir en `nginx.conf` las rutas SPA hacia el shell:

```nginx
location /app/ {
    try_files $uri $uri/ /app/index.html;
}
```

DaveFit **no** usa esta opción: su `nginx.conf` no hace `try_files`, solo `proxy_pass` al servidor SSR.

#### Opción B: adapter de Astro para Node.js (base de la arquitectura de DaveFit)

Configurar el adapter para que el servidor maneje las rutas SPA:

```js
// astro.config.mjs
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
});
```

### Errores Comunes

1. **404 al acceder directamente a `/dashboard`**
   - Causa: falta `src/pages/[...slug].astro`, o el servidor SSR de Node no está respondiendo detrás de nginx
   - Solución: verificar que el catch-all existe, que `nginx.conf` hace `proxy_pass` a `127.0.0.1:1412` y que el proceso `node dist/server/entry.mjs` está activo

2. **Rutas de imports incorrectas**
   - Causa: Al mover archivos entre carpetas, las rutas relativas cambian
   - Ejemplo: Si mueves `[...slug].astro` de `src/pages/` a un subdirectorio, las imports `../app/App` deben pasar a `../../app/App`
   - Solución: Ajustar las rutas de importación

3. **React Router no reconoce las rutas**
   - Causa: Las rutas de React Router deben coincidir con las URLs públicas reales
   - Ejemplo: Si `App.tsx` declara `<Route path="/login" />`, la URL es `/login`; si se declara `/app/login`, la URL pasa a ser `/app/login` y el catch-all seguiría respondiendo, pero los enlaces internos y la documentación deben cambiar igual
   - Solución: Mantener una única fuente de verdad (la tabla `routes` de `src/app/App.tsx`) y que la documentación la refleje

4. **Build cache tiene versión antigua**
   - Causa: Dokploy hace cache del build anterior
   - Solución: En Dokploy, usar "Redeploy" con opción `cleanCache: true` o eliminar la cache manualmente

### Checklist para Evitar Problemas

- [ ] Existe `src/pages/[...slug].astro` en la raíz de `src/pages/` (no en un subdirectorio)
- [ ] Las rutas de `src/app/App.tsx` coinciden con las URLs públicas deseadas (sin prefijo `/app`)
- [ ] `nginx.conf` hace `proxy_pass` al puerto del servidor SSR de Astro (1412 en DaveFit)
- [ ] El puerto publicado en Dokploy apunta al puerto de nginx (80 en DaveFit)
- [ ] Las imports en ficheros `.astro` usan rutas correctas respecto a su ubicación
- [ ] Probar `curl http://[IP]:[PUERTO]/dashboard` antes de declarar éxito

### Ejemplo de Estructura Correcta

```
src/
├── app/                    # Código React SPA
│   ├── App.tsx             # Tabla de rutas (sin prefijo /app)
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx
│   └── components/
├── layouts/
│   └── BaseLayout.astro
└── pages/
    ├── index.astro          # Landing page
    ├── about.astro
    ├── faq.astro
    ├── api/                 # Endpoints de Astro (prioridad sobre el catch-all)
    └── [...slug].astro      # ← CLAVE: catch-all en la raíz, sirve el SPA
```

### Configuración de React Router (App.tsx)

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/biblioteca" replace />} />
        <Route path="/biblioteca" element={<BibliotecaPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/biblioteca" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Prueba Final

Después del despliegue, verificar con una ruta real de `App.tsx`:
```bash
curl -s -o /dev/null -w "%{http_code}" http://192.168.101.133:8083/dashboard
# Debe devolver 200, no 404
```

---

*Notas añadidas después del despliegue de StreamDaveFast - Marzo 2026*
*Sección SPA añadida después del despliegue de DaveFit - Marzo 2026*
