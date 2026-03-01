# 🐳 Guía de Configuración Docker para Proyectos Web

Guía completa de configuración Docker para desplegar aplicaciones web frontend (Vite, React, Vue, etc.) en producción.

---

## 📁 Estructura de Archivos

```
proyecto/
├── Dockerfile              # Configuración multi-stage build
├── docker-compose.yml      # Orquestación del contenedor
├── nginx.conf             # Configuración del servidor web
├── .dockerignore          # Archivos excluidos del build
└── README.md              # Esta guía
```

---

## 🐳 1. Dockerfile

### Multi-Stage Build (Recomendado)

```dockerfile
# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero (mejor cache)
COPY package*.json ./
RUN npm ci

# Copiar código fuente y construir
COPY . .
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM nginx:alpine

# Eliminar configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto 80 (HTTP)
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Características:
- ✅ **Multi-stage**: Build con Node.js, producción con Nginx ligero
- ✅ **Layer caching**: Copia package.json primero para mejor cache
- ✅ **Producción limpia**: Solo incluye archivos estáticos compilados
- ✅ **Tamaño mínimo**: Imagen final ~25MB vs ~200MB con Node.js

---

## 🎛️ 2. Docker Compose

### docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nombre-app

    # Puertos: externo:interno
    ports:
      - "5171:80"

    # Política de reinicio
    restart: unless-stopped

    # Healthcheck (verifica que la app responde)
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

    # Límites de recursos (opcional pero recomendado)
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

    # Gestión de logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    # Variables de entorno (si las necesitas)
    environment:
      - NODE_ENV=production
      - API_URL=https://api.ejemplo.com
```

### Opciones de Restart:

| Política | Descripción |
|----------|-------------|
| `no` | Nunca reinicia (default) |
| `always` | Siempre reinicia, sin importar el código de salida |
| `unless-stopped` | Reinicia siempre, excepto si se detuvo manualmente |
| `on-failure` | Reinicia solo si el contenedor falla |

**Recomendado**: `unless-stopped` para producción

---

## 🌐 3. Configuración Nginx

### nginx.conf

```nginx
server {
    # Puerto interno del contenedor
    listen 80;
    server_name localhost;

    # Directorio raíz
    root /usr/share/nginx/html;
    index index.html;

    # ========== COMPRESIÓN GZIP ==========
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # ========== HEADERS DE SEGURIDAD ==========
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache para assets estáticos (1 año)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ========== SPA ROUTING ==========
    # Redirige todas las rutas a index.html (para React, Vue, etc.)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Healthcheck endpoint
    location /health {
        access_log off;
        add_header Content-Type text/plain;
        return 200 "healthy\n";
    }
}
```

### Para HTTPS (SSL/TLS):

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    # Certificados SSL
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... resto de la configuración
}

# Redirección HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 🚫 4. .dockerignore

```
# Dependencias
node_modules
npm-debug.log
yarn-error.log
package-lock.json
yarn.lock

# Git
.git
.gitignore

# IDE y editores
.vscode
.idea
*.swp
*.swo
*~

# Sistema operativo
.DS_Store
Thumbs.db

# Archivos de entorno (excepto los necesarios)
.env
.env.local
.env.*.local

# Documentación
*.md
README.md
CHANGELOG.md

# Tests
coverage
.nyc_output
tests
__tests__
*.test.js
*.spec.js

# Build local (se genera dentro del contenedor)
dist
build
```

---

## 🚀 Comandos de Despliegue

### Primera vez:

```bash
# Construir imagen
docker compose build --no-cache

# Iniciar en modo detached
docker compose up -d

# Verificar estado
docker compose ps
```

### Actualización:

```bash
# Reconstruir y reiniciar
docker compose down
docker compose up -d --build

# O en un solo comando:
docker compose up -d --build --force-recreate
```

### Gestión:

```bash
# Ver logs
docker compose logs -f

# Ver últimos 100 logs
docker compose logs --tail=100

# Reiniciar
docker compose restart

# Detener
docker compose down

# Limpiar todo (incluyendo volúmenes)
docker compose down -v

# Ver estadísticas
docker stats nombre-contenedor
```

---

## 🔧 Configuraciones Adicionales

### Multi-puertos (API + Frontend):

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432/mydb
    depends_on:
      - database
  
  database:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password

volumes:
  postgres_data:
```

### Variables de Entorno con archivo .env:

**.env:**
```
NODE_ENV=production
PORT=80
API_URL=https://api.miapp.com
```

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    env_file:
      - .env
    ports:
      - "${PORT}:80"
```

### Redes Personalizadas:

```yaml
services:
  frontend:
    build: .
    networks:
      - frontend-network
      - backend-network

  backend:
    build: ./api
    networks:
      - backend-network
      - database-network

  db:
    image: postgres:15
    networks:
      - database-network

networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge
  database-network:
    driver: bridge
    internal: true  # Sin acceso externo
```

---

## 🛡️ Mejores Prácticas

### 1. Seguridad:
- ✅ Usar imágenes oficiales (node:20-alpine, nginx:alpine)
- ✅ Especificar versiones exactas (no usar `latest`)
- ✅ No ejecutar como root (añadir `USER node` si es necesario)
- ✅ Mantener imágenes actualizadas
- ✅ Usar `.dockerignore` para no incluir archivos sensibles

### 2. Rendimiento:
- ✅ Usar Alpine Linux (imágenes más pequeñas)
- ✅ Multi-stage builds (separar build de producción)
- ✅ Optimizar layer caching (copiar dependencias primero)
- ✅ Comprimir assets (gzip en Nginx)
- ✅ Configurar caché apropiada

### 3. Monitoreo:
- ✅ Implementar healthchecks
- ✅ Limitar recursos (CPU/Memoria)
- ✅ Configurar rotación de logs
- ✅ Usar restart policies apropiadas

### 4. Producción:
- ✅ Usar `unless-stopped` para auto-reinicio
- ✅ Configurar límites de recursos
- ✅ Separar build de runtime
- ✅ No exponer puertos innecesarios
- ✅ Usar HTTPS en producción

---

## 📊 Troubleshooting

### Contenedor no inicia:
```bash
docker compose logs
```

### Puerto ocupado:
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "8080:80"  # Puerto 8080 en el host
```

### Permisos:
```bash
chmod -R 755 ./proyecto
```

### Limpiar todo y empezar de cero:
```bash
docker compose down -v
docker system prune -a
docker compose up -d --build
```

### Ver tamaño de imágenes:
```bash
docker images
```

---

## 📝 Checklist de Producción

- [ ] Dockerfile optimizado (multi-stage)
- [ ] docker-compose.yml con restart policy
- [ ] Healthcheck configurado
- [ ] Límites de recursos establecidos
- [ ] Logs configurados con rotación
- [ ] .dockerignore completo
- [ ] Variables de entorno configuradas
- [ ] HTTPS/TLS configurado (si aplica)
- [ ] Dominio configurado (no usar IP para OAuth)
- [ ] Backup de datos persistentes
- [ ] Monitoreo implementado

---

## 🔗 Recursos Útiles

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

---

**Autor**: TaskMaster Team  
**Versión**: 1.0  
**Última actualización**: 2025
