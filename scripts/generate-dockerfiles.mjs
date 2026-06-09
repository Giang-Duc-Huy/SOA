#!/usr/bin/env node
/** Generate per-service Dockerfiles from the generic template */
import { writeFileSync } from "fs";
import { join } from "path";

const SERVICES = [
  "patient-service",
  "appointment-service",
  "emr-service",
  "clinical-service",
  "lab-radiology-service",
  "pharmacy-service",
  "billing-service",
  "analytics-service",
];

const ROOT = join(import.meta.dirname, "..");

const DOCKERFILE = (name, port) => `FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY libs ./libs
COPY services/${name} ./services/${name}

RUN npm install -w ${name} -w @hm/contracts -w @hm/logger -w @hm/telemetry -w @hm/messaging --include-workspace-root
RUN npm run build -w @hm/logger -w @hm/telemetry -w @hm/contracts -w @hm/messaging

WORKDIR /app/services/${name}
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/${name}/dist ./dist
COPY --from=builder /app/services/${name}/prisma ./prisma
COPY --from=builder /app/services/${name}/src/generated ./src/generated
COPY --from=builder /app/services/${name}/package.json ./package.json
COPY --from=builder /app/libs ./libs

ENV NODE_ENV=production
ENV SERVICE_NAME=${name}
EXPOSE ${port}

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
`;

const PORTS = {
  "patient-service": 3002,
  "appointment-service": 3003,
  "emr-service": 3004,
  "clinical-service": 3005,
  "lab-radiology-service": 3006,
  "pharmacy-service": 3007,
  "billing-service": 3008,
  "analytics-service": 3009,
};

for (const svc of SERVICES) {
  const path = join(ROOT, "services", svc, "Dockerfile");
  writeFileSync(path, DOCKERFILE(svc, PORTS[svc]));
  console.log(`Generated ${svc}/Dockerfile`);
}
