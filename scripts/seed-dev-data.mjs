/**
 * Seed rich demo data across all HMS databases.
 * Uses fixed UUIDs so cross-service references stay consistent.
 * Re-run safe: skips sections that already have data (use --force to reset analytics).
 */
import pg from "pg";

const CONN = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
};

const PATIENTS = [
  { id: "a1000001-0000-4000-8000-000000000001", mrn: "MRN-2024-001", firstName: "An", lastName: "Nguyễn Văn", gender: "MALE", phone: "0901234567" },
  { id: "a1000001-0000-4000-8000-000000000002", mrn: "MRN-2024-002", firstName: "Bình", lastName: "Trần Thị", gender: "FEMALE", phone: "0912345678" },
  { id: "a1000001-0000-4000-8000-000000000003", mrn: "MRN-2024-003", firstName: "Cường", lastName: "Lê Văn", gender: "MALE", phone: "0923456789" },
  { id: "a1000001-0000-4000-8000-000000000004", mrn: "MRN-2024-004", firstName: "Dung", lastName: "Phạm Thị", gender: "FEMALE", phone: "0934567890" },
  { id: "a1000001-0000-4000-8000-000000000005", mrn: "MRN-2024-005", firstName: "Em", lastName: "Hoàng Văn", gender: "MALE", phone: "0945678901" },
  { id: "a1000001-0000-4000-8000-000000000006", mrn: "MRN-2024-006", firstName: "Phương", lastName: "Võ Thị", gender: "FEMALE", phone: "0956789012" },
];

async function seedPatients(client) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Patient"`);
  if (rows[0].c >= 5) {
    console.log("[seed] Patients: already have data, skipping");
    return PATIENTS;
  }

  for (const p of PATIENTS) {
    await client.query(
      `INSERT INTO "Patient" (id, mrn, "firstName", "lastName", "dateOfBirth", gender, phone, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, '1985-06-15', $5, $6, 'ACTIVE', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.mrn, p.firstName, p.lastName, p.gender, p.phone]
    );
  }
  console.log("[seed] Patients: inserted 6 sample patients");
  return PATIENTS;
}

async function seedAppointments(client, patients) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Appointment"`);
  if (rows[0].c >= 5) {
    console.log("[seed] Appointments: already have data, skipping");
    return;
  }

  const statuses = ["COMPLETED", "COMPLETED", "BOOKED", "CONFIRMED", "CANCELLED", "COMPLETED"];
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    await client.query(
      `INSERT INTO "Appointment" (id, "patientId", "patientName", "doctorId", "doctorName", "scheduledAt", department, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'doc-001', 'Dr. Julian Smith', NOW() - INTERVAL '${i + 1} days', $3, $4, NOW(), NOW())`,
      [p.id, `${p.lastName} ${p.firstName}`, i % 2 === 0 ? "Nội khoa" : "Tim mạch", statuses[i]]
    );
  }
  console.log("[seed] Appointments: inserted 6 appointments");
}

async function seedEmr(client, patients) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Encounter" WHERE status = 'COMPLETED'`);
  if (rows[0].c >= 1) {
    console.log("[seed] EMR: encounters exist, ensuring clinical data...");
  }

  // Update existing draft encounters with real patient IDs
  await client.query(`
    UPDATE "Encounter" SET "patientId" = $1, "patientName" = 'Nguyễn Văn An'
    WHERE "patientName" = 'Nguyễn Văn An' OR "patientId" = '00000000-0000-4000-8000-000000000001'
  `, [patients[0].id]);

  await client.query(`
    UPDATE "Encounter" SET "patientId" = $1, "patientName" = 'Trần Thị Bình'
    WHERE "patientName" = 'Trần Thị Bình' OR "patientId" = '00000000-0000-4000-8000-000000000002'
  `, [patients[1].id]);

  const { rows: encRows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Encounter"`);
  if (encRows[0].c === 0) {
    await client.query(`
      INSERT INTO "Encounter" (id, "patientId", "patientName", "doctorName", department, status, "chiefComplaint", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), $1, 'Nguyễn Văn An', 'Dr. Julian Smith', 'Nội khoa', 'DRAFT', 'Đau đầu, chóng mặt', NOW(), NOW()),
        (gen_random_uuid(), $2, 'Trần Thị Bình', 'Dr. Julian Smith', 'Tim mạch', 'ACTIVE', 'Tăng huyết áp', NOW(), NOW()),
        (gen_random_uuid(), $3, 'Lê Văn Cường', 'Dr. Julian Smith', 'Nội khoa', 'COMPLETED', 'Sốt, ho', NOW() - INTERVAL '2 days', NOW())
    `, [patients[0].id, patients[1].id, patients[2].id]);
    console.log("[seed] EMR: inserted 3 encounters");
  }
}

async function seedClinical(client) {
  const emr = new pg.Client({ ...CONN, database: "emr_db" });
  await emr.connect();
  const { rows: encounters } = await emr.query(`SELECT id, "patientName" FROM "Encounter" LIMIT 3`);
  await emr.end();

  if (encounters.length === 0) return;

  for (const e of encounters) {
    const { rows: vitals } = await client.query(`SELECT id FROM "VitalSign" WHERE "encounterId" = $1`, [e.id]);
    if (vitals.length === 0) {
      await client.query(
        `INSERT INTO "VitalSign" (id, "encounterId", pulse, "systolicBp", "diastolicBp", temperature, spo2, "recordedAt")
         VALUES (gen_random_uuid(), $1, 78, 128, 82, 36.8, 98, NOW())`,
        [e.id]
      );
    }
    const { rows: diag } = await client.query(`SELECT id FROM "Diagnosis" WHERE "encounterId" = $1`, [e.id]);
    if (diag.length === 0) {
      await client.query(
        `INSERT INTO "Diagnosis" (id, "encounterId", "icd10Code", description, "isPrimary", "createdAt")
         VALUES (gen_random_uuid(), $1, 'I10', 'Tăng huyết áp vô căn', true, NOW())`,
        [e.id]
      );
    }
    const { rows: rx } = await client.query(`SELECT id FROM "Prescription" WHERE "encounterId" = $1`, [e.id]);
    if (rx.length === 0) {
      await client.query(
        `INSERT INTO "Prescription" (id, "encounterId", "drugName", dosage, frequency, duration, "createdAt")
         VALUES (gen_random_uuid(), $1, 'Amlodipine', '5mg', '1 lần/ngày', '30 ngày', NOW())`,
        [e.id]
      );
    }
  }
  console.log("[seed] Clinical: vitals/diagnoses/prescriptions seeded");
}

async function seedPharmacy(client) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Medicine"`);
  if (rows[0].c === 0) {
    await client.query(`
      INSERT INTO "Medicine" (id, name, unit, "stockQuantity", "lowStockThreshold", price, "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), 'Paracetamol 500mg', 'viên', 500, 50, 5000, NOW(), NOW()),
        (gen_random_uuid(), 'Amoxicillin 500mg', 'viên', 200, 30, 12000, NOW(), NOW()),
        (gen_random_uuid(), 'Amlodipine 5mg', 'viên', 8, 10, 15000, NOW(), NOW()),
        (gen_random_uuid(), 'Omeprazole 20mg', 'viên', 150, 20, 8000, NOW(), NOW()),
        (gen_random_uuid(), 'Metformin 500mg', 'viên', 300, 40, 9000, NOW(), NOW())
    `);
    console.log("[seed] Pharmacy: inserted 5 medicines");
  }

  const { rows: rxRows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Prescription"`);
  if (rxRows[0].c > 0) return;

  const { rows: meds } = await client.query(`SELECT id, name FROM "Medicine" LIMIT 2`);
  if (meds.length < 2) return;

  const patientId = PATIENTS[0].id;
  const { rows: rx } = await client.query(
    `INSERT INTO "Prescription" (id, "patientId", status, "createdAt")
     VALUES (gen_random_uuid(), $1, 'PENDING', NOW()) RETURNING id`,
    [patientId]
  );
  await client.query(
    `INSERT INTO "PrescriptionItem" (id, "prescriptionId", "medicineId", quantity)
     VALUES (gen_random_uuid(), $1, $2, 30), (gen_random_uuid(), $1, $3, 20)`,
    [rx[0].id, meds[0].id, meds[1].id]
  );
  console.log("[seed] Pharmacy: inserted 1 pending prescription");
}

async function seedBilling(client, patients) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "Invoice"`);
  if (rows[0].c >= 3) {
    console.log("[seed] Billing: invoices already exist, skipping");
    return;
  }

  const invoices = [
    { patientId: patients[0].id, desc: "Khám nội khoa", qty: 1, price: 250000, status: "PAID" },
    { patientId: patients[1].id, desc: "Khám tim mạch + ECG", qty: 1, price: 450000, status: "PAID" },
    { patientId: patients[2].id, desc: "Xét nghiệm máu", qty: 1, price: 180000, status: "ISSUED" },
    { patientId: patients[3].id, desc: "Siêu âm bụng", qty: 1, price: 320000, status: "PAID" },
    { patientId: patients[4].id, desc: "Nội soi dạ dày", qty: 1, price: 850000, status: "ISSUED" },
  ];

  for (const inv of invoices) {
    const amount = inv.qty * inv.price;
    const { rows: created } = await client.query(
      `INSERT INTO "Invoice" (id, "patientId", status, "totalAmount", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::"InvoiceStatus", $3, NOW() - INTERVAL '${Math.floor(Math.random() * 7) + 1} days', NOW())
       RETURNING id`,
      [inv.patientId, inv.status, amount]
    );
    await client.query(
      `INSERT INTO "InvoiceItem" (id, "invoiceId", description, quantity, "unitPrice", amount)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
      [created[0].id, inv.desc, inv.qty, inv.price, amount]
    );
    if (inv.status === "PAID") {
      await client.query(
        `INSERT INTO "Payment" (id, "invoiceId", method, amount, status, "paidAt")
         VALUES (gen_random_uuid(), $1, 'CASH', $2, 'COMPLETED', NOW())`,
        [created[0].id, amount]
      );
    }
  }
  console.log("[seed] Billing: inserted 5 invoices");
}

async function seedLab(client, patients) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "LabOrder"`);
  if (rows[0].c >= 3) return;

  const tests = [
    { patientId: patients[0].id, type: "LAB", testName: "CBC - Tổng phân tích tế bào máu", status: "COMPLETED" },
    { patientId: patients[1].id, type: "LAB", testName: "Glucose máu", status: "COMPLETED" },
    { patientId: patients[2].id, type: "RADIOLOGY", testName: "X-Quang phổi", status: "COMPLETED" },
    { patientId: patients[3].id, type: "LAB", testName: "Chức năng gan", status: "ORDERED" },
  ];

  for (const t of tests) {
    await client.query(
      `INSERT INTO "LabOrder" (id, "patientId", type, "testName", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
      [t.patientId, t.type, t.testName, t.status]
    );
  }
  console.log("[seed] Lab: inserted 4 lab orders");
}

async function seedAnalytics(client, force = false) {
  if (force) {
    await client.query(`DELETE FROM "RevenueMetric"`);
    await client.query(`DELETE FROM "AppointmentMetric"`);
    await client.query(`DELETE FROM "LabMetric"`);
    await client.query(`DELETE FROM "PharmacyMetric"`);
  } else {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "RevenueMetric"`);
    if (rows[0].c >= 4) {
      console.log("[seed] Analytics: metrics already exist, skipping");
      return;
    }
  }

  await client.query(`
    INSERT INTO "RevenueMetric" (id, "invoiceId", amount, "paidAt", "createdAt")
    VALUES
      (gen_random_uuid(), 'inv-001', 250000, NOW() - INTERVAL '6 days', NOW()),
      (gen_random_uuid(), 'inv-002', 450000, NOW() - INTERVAL '5 days', NOW()),
      (gen_random_uuid(), 'inv-003', 320000, NOW() - INTERVAL '3 days', NOW()),
      (gen_random_uuid(), 'inv-004', 850000, NOW() - INTERVAL '2 days', NOW()),
      (gen_random_uuid(), 'inv-005', 180000, NOW() - INTERVAL '1 day', NOW()),
      (gen_random_uuid(), 'inv-006', 520000, NOW(), NOW())
  `);

  await client.query(`
    INSERT INTO "AppointmentMetric" (id, "appointmentId", "patientId", status, "createdAt")
    VALUES
      (gen_random_uuid(), 'appt-001', $1, 'COMPLETED', NOW()),
      (gen_random_uuid(), 'appt-002', $2, 'COMPLETED', NOW()),
      (gen_random_uuid(), 'appt-003', $3, 'BOOKED', NOW()),
      (gen_random_uuid(), 'appt-004', $4, 'CONFIRMED', NOW()),
      (gen_random_uuid(), 'appt-005', $5, 'CANCELLED', NOW()),
      (gen_random_uuid(), 'appt-006', $6, 'COMPLETED', NOW())
  `, PATIENTS.map((p) => p.id));

  await client.query(`
    INSERT INTO "LabMetric" (id, "labOrderId", type, status, "createdAt")
    VALUES
      (gen_random_uuid(), 'lab-001', 'CBC - Tổng phân tích tế bào máu', 'COMPLETED', NOW()),
      (gen_random_uuid(), 'lab-002', 'Glucose máu', 'COMPLETED', NOW()),
      (gen_random_uuid(), 'lab-003', 'X-Quang phổi', 'COMPLETED', NOW()),
      (gen_random_uuid(), 'lab-004', 'Chức năng gan', 'COMPLETED', NOW())
  `);

  await client.query(`
    INSERT INTO "PharmacyMetric" (id, "medicineId", "medicineName", "stockQuantity", "eventType", "createdAt")
    VALUES
      (gen_random_uuid(), 'med-001', 'Amlodipine 5mg', 8, 'pharmacy.stock-low', NOW()),
      (gen_random_uuid(), 'med-002', 'Paracetamol 500mg', 45, 'pharmacy.stock-low', NOW())
  `);

  console.log("[seed] Analytics: inserted rich metrics");
}

async function main() {
  const force = process.argv.includes("--force");
  console.log("[seed] Seeding demo data...");

  const patientDb = new pg.Client({ ...CONN, database: "patient_db" });
  await patientDb.connect();
  const patients = await seedPatients(patientDb);
  await patientDb.end();

  const apptDb = new pg.Client({ ...CONN, database: "appointment_db" });
  await apptDb.connect();
  await seedAppointments(apptDb, patients);
  await apptDb.end();

  const emrDb = new pg.Client({ ...CONN, database: "emr_db" });
  await emrDb.connect();
  await seedEmr(emrDb, patients);
  await emrDb.end();

  const clinicalDb = new pg.Client({ ...CONN, database: "clinical_db" });
  await clinicalDb.connect();
  await seedClinical(clinicalDb);
  await clinicalDb.end();

  const pharmacyDb = new pg.Client({ ...CONN, database: "pharmacy_db" });
  await pharmacyDb.connect();
  await seedPharmacy(pharmacyDb);
  await pharmacyDb.end();

  const billingDb = new pg.Client({ ...CONN, database: "billing_db" });
  await billingDb.connect();
  await seedBilling(billingDb, patients);
  await billingDb.end();

  const labDb = new pg.Client({ ...CONN, database: "lab_db" });
  await labDb.connect();
  await seedLab(labDb, patients);
  await labDb.end();

  const analyticsDb = new pg.Client({ ...CONN, database: "analytics_db" });
  await analyticsDb.connect();
  await seedAnalytics(analyticsDb, force);
  await analyticsDb.end();

  console.log("[seed] Done! Refresh the browser to see updated data.");
}

main().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
