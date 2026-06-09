const API_BASE = import.meta.env.VITE_API_URL ?? "";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json();
}

// ─── Billing ───────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  amount: number | string;
}

export interface Payment {
  id: string;
  method: string;
  amount: number | string;
  status: string;
  paidAt?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  appointmentId?: string;
  status: string;
  totalAmount: number | string;
  createdAt: string;
  items: InvoiceItem[];
  payments: Payment[];
}

export async function fetchInvoices(token: string) {
  const res = await fetch(`${API_BASE}/api/billing/invoices`, { headers: authHeaders(token) });
  return handleResponse<Invoice[]>(res);
}

export async function createInvoice(
  token: string,
  data: {
    patientId: string;
    appointmentId?: string;
    items: { description: string; quantity: number; unitPrice: number }[];
  }
) {
  const res = await fetch(`${API_BASE}/api/billing/invoices`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Invoice>(res);
}

export async function payInvoice(token: string, id: string, method: string, amount?: number) {
  const res = await fetch(`${API_BASE}/api/billing/invoices/${id}/pay`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ method, amount }),
  });
  return handleResponse<{ invoice: Invoice; payment: Payment }>(res);
}

// ─── Lab ───────────────────────────────────────────────────────────────────

export interface LabOrder {
  id: string;
  patientId: string;
  appointmentId?: string;
  type: string;
  testName: string;
  status: string;
  result?: string;
  createdAt: string;
  results?: { id: string; resultText: string; fileUrl?: string; completedAt: string }[];
}

export async function fetchLabOrders(token: string) {
  const res = await fetch(`${API_BASE}/api/lab`, { headers: authHeaders(token) });
  return handleResponse<LabOrder[]>(res);
}

export async function createLabOrder(
  token: string,
  data: { patientId: string; appointmentId?: string; type: string; testName: string }
) {
  const res = await fetch(`${API_BASE}/api/lab`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<LabOrder>(res);
}

export async function submitLabResult(token: string, id: string, resultText: string) {
  const res = await fetch(`${API_BASE}/api/lab/${id}/result`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ resultText }),
  });
  return handleResponse<{ order: LabOrder }>(res);
}

// ─── Pharmacy ────────────────────────────────────────────────────────────────

export interface Medicine {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  price: number | string;
  expiredAt?: string;
}

export interface PharmacyPrescription {
  id: string;
  patientId: string;
  appointmentId?: string;
  status: string;
  createdAt: string;
  items: { id: string; quantity: number; medicine: Medicine }[];
}

export async function fetchMedicines(token: string) {
  const res = await fetch(`${API_BASE}/api/pharmacy/medicines`, { headers: authHeaders(token) });
  return handleResponse<Medicine[]>(res);
}

export async function createMedicine(
  token: string,
  data: { name: string; unit: string; stockQuantity: number; lowStockThreshold?: number; price: number }
) {
  const res = await fetch(`${API_BASE}/api/pharmacy/medicines`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Medicine>(res);
}

export async function updateMedicineStock(token: string, id: string, stockQuantity: number) {
  const res = await fetch(`${API_BASE}/api/pharmacy/medicines/${id}/stock`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ stockQuantity }),
  });
  return handleResponse<Medicine>(res);
}

export async function fetchPharmacyPrescriptions(token: string) {
  const res = await fetch(`${API_BASE}/api/pharmacy/prescriptions`, { headers: authHeaders(token) });
  return handleResponse<PharmacyPrescription[]>(res);
}

export async function dispensePrescription(token: string, id: string) {
  const res = await fetch(`${API_BASE}/api/pharmacy/prescriptions/${id}/dispense`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<PharmacyPrescription>(res);
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalRevenue: number;
  totalAppointments: number;
  completedLabResults: number;
  lowStockMedicines: number;
  appointmentsByStatus?: Record<string, number>;
  revenuePayments?: { id: string; amount: number | string; paidAt: string }[];
  labRecords?: { id: string; labOrderId: string; type: string; status: string; createdAt: string }[];
  pharmacyAlerts?: { id: string; medicineName: string; stockQuantity: number; eventType: string }[];
}

export async function fetchAnalyticsSummary(token: string) {
  const res = await fetch(`${API_BASE}/api/analytics/summary`, { headers: authHeaders(token) });
  return handleResponse<AnalyticsSummary>(res);
}

export async function fetchAnalyticsRevenue(token: string) {
  const res = await fetch(`${API_BASE}/api/analytics/revenue`, { headers: authHeaders(token) });
  return handleResponse<{ totalRevenue: number; payments: unknown[] }>(res);
}

export async function fetchAnalyticsAppointments(token: string) {
  const res = await fetch(`${API_BASE}/api/analytics/appointments`, { headers: authHeaders(token) });
  return handleResponse<{ total: number; byStatus: Record<string, number>; records: unknown[] }>(res);
}

// ─── Admin (Users & Roles) ───────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  isActive: boolean;
  createdAt: string;
  roles: { id: string; name: string }[];
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  permissions: { permission: { id: string; name: string; resource: string; action: string } }[];
  _count: { users: number };
}

export async function fetchUsers(token: string) {
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders(token) });
  return handleResponse<AdminUser[]>(res);
}

export async function updateUser(
  token: string,
  id: string,
  data: Partial<{ firstName: string; lastName: string; title: string; isActive: boolean }>
) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export async function fetchRoles(token: string) {
  const res = await fetch(`${API_BASE}/api/roles`, { headers: authHeaders(token) });
  return handleResponse<AdminRole[]>(res);
}

export async function assignUserRoles(token: string, userId: string, roleIds: string[]) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/roles`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ roleIds }),
  });
  return handleResponse<AdminUser>(res);
}

export async function deactivateUser(token: string, id: string) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
}
