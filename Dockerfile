# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero para cachear mejor
COPY package*.json ./
RUN npm install

# Copiar el resto del código y construir
COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar solo lo necesario para producción (Astro SSR con Node Adapter)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Configurar variables de entorno
ENV HOST=0.0.0.0
ENV PORT=1412
ENV NODE_ENV=production

EXPOSE 1412

# Iniciar el servidor de Astro
CMD ["node", "./dist/server/entry.mjs"]
