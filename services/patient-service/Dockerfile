FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY libs ./libs
COPY services/patient-service ./services/patient-service

RUN npm install -w patient-service -w @hm/contracts -w @hm/logger -w @hm/telemetry -w @hm/messaging --include-workspace-root
RUN npm run build -w @hm/logger -w @hm/telemetry -w @hm/contracts -w @hm/messaging

WORKDIR /app/services/patient-service
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/patient-service/dist ./dist
COPY --from=builder /app/services/patient-service/prisma ./prisma
COPY --from=builder /app/services/patient-service/src/generated ./src/generated
COPY --from=builder /app/services/patient-service/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
ENV SERVICE_NAME=patient-service
EXPOSE 3002

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
