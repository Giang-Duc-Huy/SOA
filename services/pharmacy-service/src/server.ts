import { createApp } from "./app.js";
import { startConsumer } from "./kafka/consumer.js";

const PORT = Number(process.env.PORT ?? 3007);
const SERVICE_NAME = process.env.SERVICE_NAME ?? "pharmacy-service";

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
  });

  startConsumer().catch((err) => {
    console.error(`[${SERVICE_NAME}] Failed to start Kafka consumer:`, err);
  });
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] Failed to start:`, err);
  process.exit(1);
});
