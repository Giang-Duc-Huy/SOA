FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY libs ./libs
COPY services/analytics-service ./services/analytics-service

RUN npm install -w analytics-service -w @hm/contracts -w @hm/logger -w @hm/telemetry -w @hm/messaging --include-workspace-root
RUN npm run build -w @hm/logger -w @hm/telemetry -w @hm/contracts -w @hm/messaging

WORKDIR /app/services/analytics-service
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/analytics-service/dist ./dist
COPY --from=builder /app/services/analytics-service/prisma ./prisma
COPY --from=builder /app/services/analytics-service/src/generated ./src/generated
COPY --from=builder /app/services/analytics-service/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
ENV SERVICE_NAME=analytics-service
EXPOSE 3009

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
