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

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
  insuranceNo?: string;
  status: string;
  lastVisitAt?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  scheduledAt: string;
  endAt?: string;
  department: string;
  room?: string;
  reason?: string;
  appointmentType?: string;
  specialty?: string;
  status: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  doctorId?: string;
  doctorName?: string;
  department?: string;
  status: string;
  chiefComplaint?: string;
  summary?: string;
  createdAt: string;
}

export interface VitalSign {
  id: string;
  encounterId: string;
  pulse?: number;
  systolicBp?: number;
  diastolicBp?: number;
  temperature?: number;
  spo2?: number;
  status?: Record<string, string>;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
  isPrimary: boolean;
}

export interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export async function fetchPatients(
  token: string,
  params?: { q?: string; status?: string; page?: number }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  const qs = search.toString();

  const res = await fetch(`${API_BASE}/api/patients${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
  return handleResponse<{ data: Patient[]; pagination: { total: number; page: number; totalPages: number } }>(res);
}

export async function createPatient(
  token: string,
  data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone?: string;
    insuranceNo?: string;
  }
) {
  const res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Patient>(res);
}

export async function fetchAppointments(
  token: string,
  params?: { from?: string; to?: string; doctorId?: string; status?: string }
) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.doctorId) search.set("doctorId", params.doctorId);
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();

  const res = await fetch(`${API_BASE}/api/appointments${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
  return handleResponse<{ data: Appointment[] }>(res);
}

export async function bookAppointment(
  token: string,
  data: {
    patientId: string;
    patientName?: string;
    doctorId: string;
    doctorName?: string;
    scheduledAt: string;
    department: string;
    room?: string;
    appointmentType?: string;
    specialty?: string;
    reason?: string;
  }
) {
  const res = await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Appointment>(res);
}

export async function cancelAppointment(token: string, id: string, reason?: string) {
  const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
  return handleResponse<Appointment>(res);
}

export async function completeAppointment(token: string, id: string) {
  const res = await fetch(`${API_BASE}/api/appointments/${id}/complete`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<Appointment>(res);
}

export async function fetchEncounters(token: string, patientId?: string) {
  const qs = patientId ? `?patientId=${patientId}` : "";
  const res = await fetch(`${API_BASE}/api/emr/encounters${qs}`, {
    headers: authHeaders(token),
  });
  return handleResponse<{ data: Encounter[] }>(res);
}

export async function fetchEncounterSummary(token: string, encounterId: string) {
  const res = await fetch(`${API_BASE}/api/clinical/encounters/${encounterId}/summary`, {
    headers: authHeaders(token),
  });
  return handleResponse<{
    encounterId: string;
    vitals: VitalSign | null;
    diagnoses: Diagnosis[];
    prescriptions: Prescription[];
  }>(res);
}

export async function recordVitals(
  token: string,
  encounterId: string,
  data: Partial<VitalSign>
) {
  const res = await fetch(`${API_BASE}/api/clinical/encounters/${encounterId}/vitals`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<VitalSign>(res);
}

export async function addDiagnosis(
  token: string,
  encounterId: string,
  data: { icd10Code: string; description: string; isPrimary?: boolean }
) {
  const res = await fetch(`${API_BASE}/api/clinical/encounters/${encounterId}/diagnoses`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Diagnosis>(res);
}

export async function addPrescription(
  token: string,
  encounterId: string,
  data: { drugName: string; dosage: string; frequency: string; duration?: string; instructions?: string }
) {
  const res = await fetch(`${API_BASE}/api/clinical/encounters/${encounterId}/prescriptions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Prescription>(res);
}
