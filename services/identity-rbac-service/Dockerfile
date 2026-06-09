FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY libs ./libs
COPY services/identity-rbac-service ./services/identity-rbac-service
COPY tsconfig.base.json ./

RUN npm install -w identity-rbac-service -w @hm/contracts -w @hm/logger -w @hm/telemetry --include-workspace-root

# Build shared workspace libraries so their `dist` and type declarations exist
RUN npm run build -w @hm/logger -w @hm/telemetry -w @hm/contracts

WORKDIR /app/services/identity-rbac-service
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Install openssl so Prisma can run its query engine
RUN apk add --no-cache openssl
RUN npm install --no-audit --no-fund ts-node typescript

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/identity-rbac-service/dist ./dist
COPY --from=builder /app/services/identity-rbac-service/prisma ./prisma
COPY --from=builder /app/services/identity-rbac-service/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
