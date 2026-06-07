FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY libs ./libs
COPY services/identity-rbac-service ./services/identity-rbac-service

RUN npm install -w identity-rbac-service -w @hm/contracts -w @hm/logger -w @hm/telemetry --include-workspace-root

WORKDIR /app/services/identity-rbac-service
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/identity-rbac-service/dist ./dist
COPY --from=builder /app/services/identity-rbac-service/prisma ./prisma
COPY --from=builder /app/services/identity-rbac-service/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/server.js"]
