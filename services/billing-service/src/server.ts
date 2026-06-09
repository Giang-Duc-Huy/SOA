import { createApp } from "./app.js";
import { startConsumer } from "./kafka/consumer.js";

const PORT = Number(process.env.PORT ?? 3008);
const SERVICE_NAME = process.env.SERVICE_NAME ?? "billing-service";

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
  });

  // Start Kafka consumer in background
  startConsumer().catch((err) => {
    console.error(`[${SERVICE_NAME}] Failed to start Kafka consumer:`, err);
  });
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] Failed to start:`, err);
  process.exit(1);
});
