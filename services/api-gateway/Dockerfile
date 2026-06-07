FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY libs ./libs
COPY services/api-gateway ./services/api-gateway

RUN npm install -w api-gateway -w @hm/logger -w @hm/telemetry --include-workspace-root
WORKDIR /app/services/api-gateway
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
