# ---------- BUILD STAGE ----------
FROM node:22-alpine AS builder

# Astro inlines PUBLIC_* env vars at build time into client bundles.
# Valores por defecto para build local. En Dokploy se sobreescriben via buildArgs.
ARG PUBLIC_INSFORGE_URL=https://insforge.tesh.online
ARG PUBLIC_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTMyNzJ9.7zrvJ3VeVawf0uhSQ7eytXUDzOZMpcOlKg5pbkx2Iik
ENV PUBLIC_INSFORGE_URL=${PUBLIC_INSFORGE_URL}
ENV PUBLIC_INSFORGE_ANON_KEY=${PUBLIC_INSFORGE_ANON_KEY}

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:22-alpine AS runner

RUN apk add --no-cache nginx tini

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
# Conservamos solo production deps del node_modules completo del builder
RUN npm prune --production && npm cache clean --force

COPY nginx.conf /etc/nginx/http.d/default.conf

ENV HOST=0.0.0.0
ENV PORT=1412
ENV NODE_ENV=production

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD sh -c 'nginx -g "daemon off;" & exec node dist/server/entry.mjs'
