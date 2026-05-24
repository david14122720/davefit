# ---------- BUILD STAGE ----------
FROM node:20.20.2-alpine AS builder

# Astro inlines PUBLIC_* env vars at build time into client bundles.
# These MUST be passed via --build-arg, not at runtime.
ARG PUBLIC_INSFORGE_URL
ARG PUBLIC_INSFORGE_ANON_KEY

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:20.20.2-alpine AS runner

RUN apk add --no-cache nginx tini

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production --ignore-scripts && npm cache clean --force

COPY nginx.conf /etc/nginx/http.d/default.conf

ENV HOST=0.0.0.0
ENV PORT=1412
ENV NODE_ENV=production

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD sh -c 'nginx -g "daemon off;" & exec node dist/server/entry.mjs'
