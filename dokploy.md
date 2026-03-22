# Guía de Despliegue Universal en Dokploy

Esta guía describe el proceso general para desplegar cualquier proyecto en el servidor de Dokploy dentro de la red local.

## � Información del Servidor
- **IP del Servidor**: `192.168.101.133`

## �🚀 Pasos para el Despliegue

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

Al desplegar aplicaciones de página única (SPA) dentro de Astro, pueden surgir problemas de routing porque el servidor web no sabe cómo manejar rutas como `/app/dashboard` o `/app/login`.

### El Problema
- Astro genera archivos estáticos en `/dist`
- Si usas React Router (o similar) para manejar rutas internas como `/app/*`, el servidor recibe requests directos a `/app/login` y busca un archivo `dist/app/login.html` que no existe
- El resultado es un **404** al acceder directamente a rutas SPA

### La Solución

#### Opción 1: Archivo Catch-All en Astro (RECOMENDADO)

Crear un archivo `src/pages/app/[...slug].astro` que capture todas las rutas SPA:

```astro
---
import App from '../app/App'; // Ajusta la ruta según tu estructura
---
<App client:only="react" />
```

Esto genera un archivo `dist/app/index.html` que sirve como shell para el SPA, y Astro+React Router manejan las rutas internas.

#### Opción 2: Configurar nginx para reescribir rutas SPA

En tu `nginx.conf` o configuración de Dokploy, añadir:

```nginx
location /app/ {
    try_files $uri $uri/ /app/index.html;
}
```

#### Opción 3: Usar el adapter de Astro para Node.js

Si usas un adapter (Node, Express, etc.), configura para que maneje rutas SPA:

```js
// astro.config.mjs
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
});
```

### Errores Comunes

1. **404 al acceder directamente a `/app/ruta`**
   - Causa: No existe `src/pages/app/[...slug].astro` o `src/pages/app/index.astro`
   - Solución: Crear el archivo catch-all o verificar la estructura de páginas

2. **Rutas de imports incorrectas**
   - Causa: Al mover archivos entre carpetas, las rutas relativas cambian
   - Ejemplo: Si mueves `[...slug].astro` de `src/pages/` a `src/pages/app/`, las imports `../components/` deben pasar a `../../components/`
   - Solución: Ajustar las rutas de importación

3. **React Router no reconoce las rutas**
   - Causa: Las rutas en React Router deben coincidir con la estructura de Astro
   - Ejemplo: Si React define `<Route path="/app/login" />`, Astro debe tener `src/pages/app/[...slug].astro`
   - Solución: Verificar que la estructura de carpetas y las rutas de React coincidan

4. **Build cache tiene versión antigua**
   - Causa: Dokploy hace cache del build anterior
   - Solución: En Dokploy, usar "Redeploy" con opción `cleanCache: true` o eliminar la cache manualmente

### Checklist para Evitar Problemas

- [ ] La estructura de carpetas en `src/pages/` refleja las rutas de React Router
- [ ] Existe `src/pages/app/index.astro` o `src/pages/app/[...slug].astro`
- [ ] Las imports en archivos `.astro` usan rutas correctas (verificar `../` vs `../../`)
- [ ] El Dockerfile copia todos los archivos estáticos necesarios
- [ ] nginx/conf del servidor está configurado para SPA si es necesario
- [ ] Probar `curl http://[IP]:[PUERTO]/app/ruta` antes de declarar éxito

### Ejemplo de Estructura Correcta

```
src/
├── app/                    # Código React SPA
│   ├── App.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx
│   └── components/
├── layouts/
│   └── BaseLayout.astro
└── pages/
    ├── index.astro          # Landing page
    └── app/
        └── [...slug].astro   # ← CLAVE: captura /app/* y sirve el SPA
```

### Configuración de React Router (App.tsx)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/login" element={<LoginPage />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Prueba Final

Después del despliegue, verificar:
```bash
curl -s -o /dev/null -w "%{http_code}" http://192.168.101.133:8083/app/login
# Debe devolver 200, no 404
```

---

*Notas añadidas después del despliegue de StreamDaveFast - Marzo 2026*
*Sección SPA añadida después del despliegue de DaveFit - Marzo 2026*
