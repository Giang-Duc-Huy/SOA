# GCP Cloud Run + Confluent Cloud Deployment

## Architecture

```
Internet → Cloud Load Balancer → Cloud Run (api-gateway)
                                      ↓
                    Cloud Run services (patient, emr, pharmacy, billing, analytics...)
                                      ↓
                    Confluent Cloud Kafka + Cloud SQL PostgreSQL
                                      ↓
                    Cloud Monitoring + Cloud Logging (via Grafana optional)
```

## Prerequisites

- GCP project with billing enabled
- `gcloud` CLI authenticated
- Confluent Cloud cluster (Basic or Dedicated)
- Cloud SQL PostgreSQL instance (or AlloyDB)

## 1. Confluent Cloud Kafka

```bash
# Create cluster at https://confluent.cloud
export KAFKA_BROKERS="pkc-xxxxx.ap-southeast-1.aws.confluent.cloud:9092"
export KAFKA_API_KEY="your-api-key"
export KAFKA_API_SECRET="your-api-secret"
```

Set `KAFKA_BROKERS` in each Cloud Run service environment.

## 2. Build & Push to Artifact Registry

```bash
export PROJECT_ID=your-gcp-project
export REGION=asia-southeast1
export REGISTRY=$REGION-docker.pkg.dev/$PROJECT_ID/mediflow

gcloud auth configure-docker $REGION-docker.pkg.dev

for svc in identity-rbac-service api-gateway patient-service emr-service \
           pharmacy-service billing-service analytics-service frontend; do
  dockerfile="services/$svc/Dockerfile"
  [ "$svc" = "frontend" ] && dockerfile="frontend/Dockerfile"
  docker build -t $REGISTRY/$svc:latest -f $dockerfile .
  docker push $REGISTRY/$svc:latest
done
```

## 3. Deploy to Cloud Run

```bash
# API Gateway (public)
gcloud run deploy mediflow-gateway \
  --image $REGISTRY/api-gateway:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 2 \
  --max-instances 10 \
  --cpu 1 --memory 512Mi \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "JWT_SECRET=mediflow-jwt-secret:latest"

# Internal services (private — use VPC connector)
for svc_port in "patient-service:3002" "emr-service:3004" "pharmacy-service:3007" \
                "billing-service:3008" "analytics-service:3009"; do
  name="${svc_port%%:*}"
  port="${svc_port##*:}"
  gcloud run deploy mediflow-$name \
    --image $REGISTRY/$name:latest \
    --region $REGION \
    --platform managed \
    --no-allow-unauthenticated \
    --min-instances 2 \
    --max-instances 5 \
    --cpu 1 --memory 512Mi \
    --port $port \
    --vpc-connector mediflow-vpc-connector \
    --set-env-vars "NODE_ENV=production,KAFKA_BROKERS=$KAFKA_BROKERS" \
    --set-secrets "DATABASE_URL=mediflow-${name}-db:latest,JWT_SECRET=mediflow-jwt-secret:latest"
done
```

## 4. Service mesh / internal routing

Use Cloud Run service URLs in api-gateway env:

```
PATIENT_SERVICE_URL=https://mediflow-patient-service-xxxxx.run.app
EMR_SERVICE_URL=https://mediflow-emr-service-xxxxx.run.app
...
```

## 5. Observability

- **Metrics**: Cloud Run built-in metrics → Grafana Cloud or self-hosted Prometheus
- **Logs**: Cloud Logging (automatic) or forward to Loki via Grafana Agent
- **Dashboards**: Import `infra/observability/grafana/dashboards/hms-overview.json`

## Multi-replica

Cloud Run `--min-instances 2` ensures always-on multi-replica. Kafka consumer groups
scale horizontally across Cloud Run instances automatically.

See also: `infra/gcp/cloud-run-env.yaml` for env var template.
