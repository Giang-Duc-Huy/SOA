/**
 * Re-sync DOCTOR role permissions after seed.ts changes.
 * Run: npm run sync:permissions
 */
import pg from "pg";

const NEW_DOCTOR_PERMS = [
  "patients:read", "patients:write",
  "appointments:read", "appointments:write",
  "emr:read", "emr:write",
  "lab:read", "lab:write",
  "pharmacy:read", "pharmacy:write",
  "billing:read", "billing:write",
  "analytics:read",
];

async function main() {
  const client = new pg.Client({
    host: "localhost", port: 5432,
    user: "postgres", password: "postgres",
    database: "identity_db",
  });
  await client.connect();

  const role = await client.query(`SELECT id FROM "Role" WHERE name = 'DOCTOR'`);
  if (role.rows.length === 0) {
    console.log("DOCTOR role not found — run db:seed first");
    await client.end();
    return;
  }
  const roleId = role.rows[0].id;

  for (const permName of NEW_DOCTOR_PERMS) {
    const perm = await client.query(`SELECT id FROM "Permission" WHERE name = $1`, [permName]);
    if (perm.rows.length === 0) continue;
    await client.query(
      `INSERT INTO "RolePermission" ("roleId", "permissionId")
       VALUES ($1, $2) ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
      [roleId, perm.rows[0].id]
    );
  }

  console.log("[sync] DOCTOR permissions updated. Please logout and login again.");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
