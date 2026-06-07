# MediFlow HMS — Hospital Management EDA

Event-Driven Architecture monorepo cho hệ thống quản lý bệnh viện.

## Kiến trúc

- **Pattern**: REST Command → Validate → DB Transaction → Outbox → Kafka Event → Parallel Consumers
- **Stack**: Node.js 20+, Express, TypeScript, KafkaJS, PostgreSQL + Prisma, Zod
- **Observability**: OpenTelemetry + Winston + Prometheus + Grafana

## Cấu trúc

```
libs/
  contracts/     # Zod event schemas (shared-events)
  logger/        # Winston logger
  telemetry/     # OTel + Prometheus /metrics
  messaging/     # Outbox pattern + Base Consumer (idempotency, DLQ)

services/
  identity-rbac-service/   # User, Role, JWT (Huy)
  api-gateway/             # JWT auth + proxy routing (Huy)
  patient-service/         # (Vững)
  appointment-service/     # (Vững)
  ...

frontend/                  # MediFlow HMS Dashboard UI
infra/                     # Docker, Prometheus, Grafana, AWS ECS
```

## Khởi chạy Local

### 1. Cài dependencies

```bash
npm install
```

### 2. Khởi động infrastructure

```bash
docker compose up -d zookeeper kafka postgres prometheus grafana
```

### 3. Identity Service

```bash
cd services/identity-rbac-service
cp .env.example .env
npx prisma db push
npm run db:seed -w identity-rbac-service
npm run dev -w identity-rbac-service
```

### 4. API Gateway

```bash
npm run dev -w api-gateway
```

### 5. Frontend

```bash
npm run dev -w frontend
```

Truy cập: http://localhost:5173

**Tài khoản demo:**
- `dr.smith@mediflow.local` / `password123` (DOCTOR)
- `admin@mediflow.local` / `password123` (ADMIN)

## Ports

| Service | Port |
|---------|------|
| API Gateway | 3000 |
| Identity/RBAC | 3001 (local) / 3101 (docker) |
| Frontend | 5173 |
| Grafana | 3030 (admin/admin) |
| Prometheus | 9090 |
| Kafka | 29092 |
| PostgreSQL | 5432 |

## Shared Libraries (cho Vững & Tính)

### Outbox Pattern

```typescript
import { createOutboxEntry } from "@hm/messaging";

await prisma.$transaction(async (tx) => {
  const appointment = await tx.appointment.create({ data });
  await tx.outboxEvent.create({
    data: createOutboxEntry({
      aggregateType: "Appointment",
      aggregateId: appointment.id,
      eventType: "appointment.booked",
      topic: KAFKA_TOPICS.APPOINTMENT,
      payload: eventPayload,
    }),
  });
});
```

### Base Consumer

```typescript
import { BaseConsumer, createKafkaDlqPublisher } from "@hm/messaging";

const consumer = new BaseConsumer({
  consumer: kafkaConsumer,
  topics: [KAFKA_TOPICS.APPOINTMENT],
  groupId: "billing-service",
  eventTypes: ["appointment.booked"],
  processedStore,
  dlqPublisher: createKafkaDlqPublisher(producer),
  logger,
  handler: async (eventType, event) => { /* ... */ },
});
await consumer.start();
```

## CI/CD

GitHub Actions: `.github/workflows/ci.yml` — lint, build, Docker image build, ECS deploy (staging).

## Cloud Deployment

Xem `infra/aws/README.md` cho hướng dẫn deploy lên AWS ECS Fargate.
