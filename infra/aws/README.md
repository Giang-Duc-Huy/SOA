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

## GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | e.g. `ap-southeast-1` |
| `ECS_CLUSTER` | ECS cluster name |
| `JWT_SECRET` | Production JWT secret |

## Environment Variables (per service)

See `task-definitions/*.json` for full list. Key vars:

- `DATABASE_URL` — RDS connection string
- `KAFKA_BROKERS` — MSK bootstrap servers
- `JWT_SECRET` — shared across gateway + identity
