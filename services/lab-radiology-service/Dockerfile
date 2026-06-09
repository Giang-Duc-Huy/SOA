FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY libs ./libs
COPY services/lab-radiology-service ./services/lab-radiology-service

RUN npm install -w lab-radiology-service -w @hm/contracts -w @hm/logger -w @hm/telemetry -w @hm/messaging --include-workspace-root
RUN npm run build -w @hm/logger -w @hm/telemetry -w @hm/contracts -w @hm/messaging

WORKDIR /app/services/lab-radiology-service
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/lab-radiology-service/dist ./dist
COPY --from=builder /app/services/lab-radiology-service/prisma ./prisma
COPY --from=builder /app/services/lab-radiology-service/src/generated ./src/generated
COPY --from=builder /app/services/lab-radiology-service/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
ENV SERVICE_NAME=lab-radiology-service
EXPOSE 3006

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
