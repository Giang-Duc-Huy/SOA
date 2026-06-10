# AWS ECS Fargate Deployment

## Architecture

```
Internet → ALB → API Gateway (ECS Fargate)
                    ↓
              Identity Service (ECS Fargate)
                    ↓
         [Patient, Appointment, ...] (ECS Fargate)
                    ↓
         MSK (Kafka) + RDS PostgreSQL + CloudWatch
```

## Prerequisites

- AWS CLI configured
- ECR repositories created for each service
- ECS Cluster (Fargate)
- RDS PostgreSQL instance
- Amazon MSK (Kafka) or self-managed Kafka on EC2
- VPC with public/private subnets

## Quick Deploy

```bash
# 1. Set variables
export AWS_REGION=ap-southeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 2. Build & push images
for svc in identity-rbac-service api-gateway; do
  docker build -t $ECR_REGISTRY/mediflow/$svc:latest -f services/$svc/Dockerfile .
  docker push $ECR_REGISTRY/mediflow/$svc:latest
done

# 3. Register task definitions
aws ecs register-task-definition --cli-input-json file://infra/aws/task-definitions/identity-rbac-service.json
aws ecs register-task-definition --cli-input-json file://infra/aws/task-definitions/api-gateway.json

# 4. Create/update ECS services
aws ecs create-service --cli-input-json file://infra/aws/ecs-services.json
```

## GitHub Actions (CI/CD)

Workflow: `.github/workflows/ci.yml`

| Job | Runs when |
|-----|-----------|
| Lint, Test & Build | Every push / pull request |
| Build & Push Docker Images | After build passes (PR: build only, no push) |
| Deploy Staging | Push to `develop` with AWS variables configured |
| Deploy Production | Push to `main` with AWS variables configured |

### Repository Variables (`Settings → Secrets and variables → Actions → Variables`)

| Variable | Example | Description |
|----------|---------|-------------|
| `AWS_ACCOUNT_ID` | `123456789012` | AWS account ID |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.ap-southeast-1.amazonaws.com` | ECR registry URL |
| `ECS_CLUSTER` | `mediflow-cluster` | ECS cluster name |
| `AWS_REGION` | `ap-southeast-1` | Optional AWS region |

### Repository Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key (ECR push + ECS deploy) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `JWT_SECRET` | Production JWT secret (Secrets Manager / task definition) |

If AWS is not configured yet, **Lint/Build** and **Docker build** still run; **Deploy** jobs are skipped.

## Monitoring (Prometheus + Grafana)

| Component | ECS service | Image | Port |
|-----------|-------------|-------|------|
| Prometheus | `prometheus` | `mediflow/prometheus` | 9090 |
| Grafana | `grafana` | `mediflow/grafana` | 3000 |

- Prometheus config: `infra/observability/prometheus.ecs.yml` (scrapes all microservices via Cloud Map)
- Grafana dashboards: `infra/observability/grafana/dashboards/hms-overview.json`
- Deploy is included in `scripts/ecs-deploy.mjs` (apps + monitoring in one rollout)

### Extra secret for Grafana

| Secret (Secrets Manager) | Description |
|--------------------------|-------------|
| `mediflow/grafana-admin-password` | Grafana admin password (`GF_SECURITY_ADMIN_PASSWORD`) |

## Docker image catalog

All images are defined once in `infra/docker/services.json` and built by `scripts/docker-build-all.mjs` (single CI job, no per-service matrix).

## Environment Variables (per service)

See `task-definitions/*.json` for full list. Key vars:

- `DATABASE_URL` — RDS connection string
- `KAFKA_BROKERS` — MSK bootstrap servers
- `JWT_SECRET` — shared across gateway + identity
