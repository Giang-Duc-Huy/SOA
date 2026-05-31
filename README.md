# Hospital Management EDA

Skeleton monorepo for a hospital management system using Event-Driven Architecture with Kafka.

## What’s inside
- `services/*`: backend services (Express + TypeScript)
- `libs/*`: shared contracts, logger, telemetry
- `frontend/`: React + Vite UI (feature-based modules)
- `infra/`: observability config

## Next steps
1. Install dependencies with npm workspaces.
2. Implement each service’s routes, Kafka producers/consumers, and Prisma schema.
3. Wire up observability and metrics.
4. Run services via Docker Compose.

## Docker Compose
Provides Kafka, Zookeeper, Postgres, and Prometheus.
