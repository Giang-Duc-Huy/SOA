import pg from "pg";

const CONN = "postgresql://postgres:postgres@localhost:5432/postgres";

for (let i = 0; i < 30; i++) {
  try {
    const client = new pg.Client({ connectionString: CONN });
    await client.connect();
    await client.end();
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
  }
}

console.error("PostgreSQL did not start in time");
process.exit(1);
