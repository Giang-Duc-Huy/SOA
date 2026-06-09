FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY libs ./libs
COPY services/clinical-service ./services/clinical-service

RUN npm install -w clinical-service -w @hm/contracts -w @hm/logger -w @hm/telemetry -w @hm/messaging --include-workspace-root
RUN npm run build -w @hm/logger -w @hm/telemetry -w @hm/contracts -w @hm/messaging

WORKDIR /app/services/clinical-service
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/clinical-service/dist ./dist
COPY --from=builder /app/services/clinical-service/prisma ./prisma
COPY --from=builder /app/services/clinical-service/src/generated ./src/generated
COPY --from=builder /app/services/clinical-service/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
ENV SERVICE_NAME=clinical-service
EXPOSE 3005

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
