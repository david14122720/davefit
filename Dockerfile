# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

ARG PUBLIC_INSFORGE_URL
ARG PUBLIC_INSFORGE_ANON_KEY

ENV PUBLIC_INSFORGE_URL=$PUBLIC_INSFORGE_URL
ENV PUBLIC_INSFORGE_ANON_KEY=$PUBLIC_INSFORGE_ANON_KEY

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache nginx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public

COPY nginx.conf /etc/nginx/http.d/default.conf

ENV HOST=0.0.0.0
ENV PORT=1412
ENV NODE_ENV=production
ENV PUBLIC_INSFORGE_URL=https://insforge.tesh.online
ENV PUBLIC_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTMyNzJ9.7zrvJ3VeVawf0uhSQ7eytXUDzOZMpcOlKg5pbkx2Iik

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;' & node dist/server/entry.mjs"]
