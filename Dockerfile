# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN apk add --no-cache nginx

COPY nginx.conf /etc/nginx/http.d/default.conf

ENV HOST=0.0.0.0
ENV PORT=1412
ENV NODE_ENV=production

EXPOSE 80

CMD ["sh", "-c", "nginx && node dist/server/entry.mjs"]
