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

RUN apk add --no-cache nginx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

COPY nginx.conf /etc/nginx/http.d/default.conf
COPY .env.production .env

ENV HOST=0.0.0.0
ENV PORT=1412
ENV NODE_ENV=production

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;' & node dist/server/entry.mjs"]
