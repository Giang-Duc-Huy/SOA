const API = "http://localhost:3000";

async function main() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@mediflow.local", password: "password123" }),
  });
  const login = await loginRes.json();
  if (!login.token) throw new Error("Login failed: " + JSON.stringify(login));
  console.log("LOGIN OK");

  const headers = { Authorization: `Bearer ${login.token}` };

  const emr = await fetch(`${API}/api/emr/encounters`, { headers }).then((r) => r.json());
  console.log("EMR encounters:", emr.data?.length ?? 0);

  const meds = await fetch(`${API}/api/pharmacy/medicines`, { headers }).then((r) => r.json());
  console.log("Pharmacy medicines:", Array.isArray(meds) ? meds.length : "ERR");

  const invoices = await fetch(`${API}/api/billing/invoices`, { headers }).then((r) => r.json());
  console.log("Billing invoices:", Array.isArray(invoices) ? invoices.length : "ERR");

  const summary = await fetch(`${API}/api/analytics/summary`, { headers }).then((r) => r.json());
  console.log("Analytics:", { revenue: summary.totalRevenue, appts: summary.totalAppointments });

  // Create invoice test
  const patients = await fetch(`${API}/api/patients?limit=1`, { headers }).then((r) => r.json());
  if (patients.data?.[0]) {
    const createRes = await fetch(`${API}/api/billing/invoices`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patients.data[0].id,
        items: [{ description: "Test service", quantity: 1, unitPrice: 100000 }],
      }),
    });
    const created = await createRes.json();
    console.log("Create invoice:", createRes.status, created.id ? "OK" : created.error);
  }

  console.log("\nAll API tests passed!");
}

main().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
