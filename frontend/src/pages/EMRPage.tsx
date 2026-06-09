import { useEffect, useState } from "react";
import { Plus, Printer, Pencil, CheckCircle, FilePlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchEncounters,
  fetchEncounterSummary,
  fetchPatients,
  fetchPatient,
  recordVitals,
  addDiagnosis,
  addPrescription,
  updateEncounter,
  completeEncounter,
  createEncounter,
  type Encounter,
  type VitalSign,
  type Diagnosis,
  type Prescription,
  type Patient,
} from "../lib/clinical-api";
import { printEmrDocument } from "../lib/emr-print";

const statusBadge: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang điều trị",
  COMPLETED: "Hoàn thành",
};

const DEPARTMENTS = ["Nội khoa", "Tim mạch", "Ngoại khoa", "Nhi khoa", "Da liễu", "Cấp cứu"];

export function EMRPage() {
  const { token, user } = useAuth();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Encounter | null>(null);
  const [vitals, setVitals] = useState<VitalSign | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showDiagForm, setShowDiagForm] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [vitalsForm, setVitalsForm] = useState({ pulse: 78, systolicBp: 128, diastolicBp: 82, temperature: 36.8, spo2: 98 });
  const [diagForm, setDiagForm] = useState({ icd10Code: "I10", description: "Tăng huyết áp", isPrimary: true });
  const [rxForm, setRxForm] = useState({ drugName: "Amlodipine", dosage: "5mg", frequency: "1 lần/ngày", duration: "30 ngày" });
  const [editForm, setEditForm] = useState({ chiefComplaint: "", department: "", summary: "" });
  const [createForm, setCreateForm] = useState({
    patientId: "",
    department: "Nội khoa",
    chiefComplaint: "",
  });

  const doctorName = user ? `${user.firstName} ${user.lastName}` : undefined;

  const reloadEncounters = async (selectId?: string) => {
    if (!token) return;
    const res = await fetchEncounters(token);
    setEncounters(res.data);
    const targetId = selectId ?? selected?.id;
    if (targetId) {
      const updated = res.data.find((e) => e.id === targetId);
      if (updated) setSelected(updated);
    } else if (res.data.length > 0) {
      setSelected(res.data[0]);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchEncounters(token)
      .then((res) => {
        setEncounters(res.data);
        if (res.data.length > 0) setSelected(res.data[0]);
      })
      .catch(() => setEncounters([]));
    fetchPatients(token, { limit: 100 })
      .then((res) => setPatients(res.data))
      .catch(() => setPatients([]));
  }, [token]);

  useEffect(() => {
    if (!token || !selected) return;
    fetchEncounterSummary(token, selected.id)
      .then((s) => {
        setVitals(s.vitals);
        setDiagnoses(s.diagnoses);
        setPrescriptions(s.prescriptions);
      })
      .catch(() => {
        setVitals(null);
        setDiagnoses([]);
        setPrescriptions([]);
      });
  }, [token, selected]);

  const handlePrint = async () => {
    if (!selected || !token) return;
    let patient: Patient | null = null;
    try {
      patient = await fetchPatient(token, selected.patientId);
    } catch {
      patient = patients.find((p) => p.id === selected.patientId) ?? null;
    }
    printEmrDocument({
      encounter: selected,
      patient,
      vitals,
      diagnoses,
      prescriptions,
      doctorName: selected.doctorName ?? doctorName,
      doctorTitle: user?.title,
    });
  };

  const openCreate = async () => {
    setError(null);
    if (token && patients.length === 0) {
      try {
        const res = await fetchPatients(token, { limit: 100 });
        setPatients(res.data);
      } catch {
        /* ignore */
      }
    }
    setCreateForm({ patientId: "", department: "Nội khoa", chiefComplaint: "" });
    setShowCreateForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !createForm.patientId) return;
    const patient = patients.find((p) => p.id === createForm.patientId);
    setSaving(true);
    setError(null);
    try {
      const created = await createEncounter(token, {
        patientId: createForm.patientId,
        patientName: patient?.fullName,
        department: createForm.department,
        chiefComplaint: createForm.chiefComplaint || undefined,
        doctorName: doctorName,
      });
      setShowCreateForm(false);
      await reloadEncounters(created.id);
      setSelected(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tạo bệnh án thất bại");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setEditForm({
      chiefComplaint: selected.chiefComplaint ?? "",
      department: selected.department ?? "",
      summary: selected.summary ?? "",
    });
    setShowEditForm(true);
    setError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateEncounter(token, selected.id, {
        chiefComplaint: editForm.chiefComplaint,
        department: editForm.department,
        summary: editForm.summary,
        status: selected.status === "DRAFT" ? "ACTIVE" : selected.status,
      });
      setSelected(updated);
      setShowEditForm(false);
      await reloadEncounters(updated.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!token || !selected || selected.status === "COMPLETED") return;
    if (!confirm("Hoàn thành bệnh án này?")) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await completeEncounter(token, selected.id, editForm.summary || selected.summary);
      setSelected(updated);
      await reloadEncounters(updated.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hoàn thành thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selected) return;
    const v = await recordVitals(token, selected.id, vitalsForm);
    setVitals(v);
    setShowVitalsForm(false);
  };

  const handleDiag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selected) return;
    const d = await addDiagnosis(token, selected.id, diagForm);
    setDiagnoses((prev) => [...prev, d]);
    setShowDiagForm(false);
  };

  const handleRx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selected) return;
    const rx = await addPrescription(token, selected.id, rxForm);
    setPrescriptions((prev) => [...prev, rx]);
    setShowRxForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase">HMS / EMR</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Hồ sơ Bệnh án Điện tử</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            <FilePlus size={16} /> Bệnh án mới
          </button>
          <button
            onClick={handlePrint}
            disabled={!selected}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer size={16} /> In EMR
          </button>
          <button
            onClick={openEdit}
            disabled={!selected || selected?.status === "COMPLETED"}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Pencil size={16} /> Chỉnh sửa
          </button>
          {selected && selected.status !== "COMPLETED" && (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle size={16} /> Hoàn thành
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold mb-3">Danh sách bệnh án</h3>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {encounters.map((enc) => (
              <button
                key={enc.id}
                onClick={() => setSelected(enc)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  selected?.id === enc.id ? "bg-primary/10 border border-primary/30" : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <p className="font-medium">{enc.patientName ?? `BN ${enc.patientId.slice(0, 8)}`}</p>
                <p className="text-xs text-gray-500">{enc.department ?? "—"}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${statusBadge[enc.status]}`}>
                  {statusLabel[enc.status] ?? enc.status}
                </span>
              </button>
            ))}
            {encounters.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">Chưa có bệnh án nào</p>
                <button onClick={openCreate} className="text-sm text-primary hover:underline">
                  + Tạo bệnh án mới
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          {selected ? (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.patientName ?? "Bệnh nhân"}</h2>
                    <p className="text-sm text-gray-500">
                      Mã BA: {selected.id.slice(0, 8).toUpperCase()} · {selected.department}
                      {selected.createdAt && ` · ${new Date(selected.createdAt).toLocaleDateString("vi-VN")}`}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadge[selected.status]}`}>
                    {statusLabel[selected.status] ?? selected.status}
                  </span>
                </div>
                {selected.chiefComplaint && (
                  <p className="mt-3 text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    {selected.chiefComplaint}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Sinh hiệu</h3>
                  <button onClick={() => setShowVitalsForm(true)} className="text-sm text-primary flex items-center gap-1">
                    <Plus size={14} /> Ghi nhận
                  </button>
                </div>
                {vitals ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Mạch", value: `${vitals.pulse} bpm`, status: vitals.status?.pulse },
                      { label: "Huyết áp", value: `${vitals.systolicBp}/${vitals.diastolicBp} mmHg`, status: vitals.status?.bloodPressure },
                      { label: "Nhiệt độ", value: `${vitals.temperature} °C`, status: vitals.status?.temperature },
                      { label: "SpO2", value: `${vitals.spo2}%`, status: vitals.status?.spo2 },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-lg font-semibold mt-1">{item.value}</p>
                        {item.status && <p className="text-xs text-teal-600 mt-1">{item.status}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Chưa ghi nhận sinh hiệu</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Chẩn đoán (ICD-10)</h3>
                    <button onClick={() => setShowDiagForm(true)} className="text-sm text-primary"><Plus size={14} /></button>
                  </div>
                  {diagnoses.length > 0 ? diagnoses.map((d) => (
                    <div key={d.id} className="text-sm py-2 border-b last:border-0">
                      <span className="font-mono text-primary">{d.icd10Code}</span> — {d.description}
                      {d.isPrimary && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Chính</span>}
                    </div>
                  )) : <p className="text-sm text-gray-400">Chưa có chẩn đoán</p>}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Đơn thuốc</h3>
                    <button onClick={() => setShowRxForm(true)} className="text-sm text-primary flex items-center gap-1">
                      <Plus size={14} /> Kê đơn
                    </button>
                  </div>
                  {prescriptions.length > 0 ? prescriptions.map((rx) => (
                    <div key={rx.id} className="text-sm py-2 border-b last:border-0">
                      <p className="font-medium">{rx.drugName} {rx.dosage}</p>
                      <p className="text-gray-500">{rx.frequency}{rx.duration ? ` · ${rx.duration}` : ""}</p>
                    </div>
                  )) : <p className="text-sm text-gray-400">Chưa có đơn thuốc</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              <p className="mb-4">Chưa có bệnh án nào được chọn</p>
              <button onClick={openCreate} className="text-primary hover:underline text-sm">
                Tạo bệnh án mới cho bệnh nhân
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <Modal title="Tạo bệnh án mới" onClose={() => setShowCreateForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bệnh nhân *</label>
              <select
                required
                value={createForm.patientId}
                onChange={(e) => setCreateForm({ ...createForm, patientId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Chọn bệnh nhân</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))}
              </select>
              {patients.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Chưa có bệnh nhân — thêm ở tab Patients trước.</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Khoa / Phòng *</label>
              <select
                required
                value={createForm.department}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Lý do khám / Triệu chứng</label>
              <textarea
                value={createForm.chiefComplaint}
                onChange={(e) => setCreateForm({ ...createForm, chiefComplaint: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="VD: Đau đầu, chóng mặt..."
                rows={3}
              />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-primary text-white py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? "Đang tạo..." : "Tạo bệnh án"}
            </button>
          </form>
        </Modal>
      )}

      {showEditForm && (
        <Modal title="Chỉnh sửa bệnh án" onClose={() => setShowEditForm(false)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <select
              required
              value={editForm.department}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <textarea
              required
              value={editForm.chiefComplaint}
              onChange={(e) => setEditForm({ ...editForm, chiefComplaint: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Lý do khám / Triệu chứng"
              rows={3}
            />
            <textarea
              value={editForm.summary}
              onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Tóm tắt bệnh án (tùy chọn)"
              rows={2}
            />
            <button type="submit" disabled={saving} className="w-full bg-primary text-white py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        </Modal>
      )}

      {showVitalsForm && (
        <Modal title="Ghi nhận sinh hiệu" onClose={() => setShowVitalsForm(false)}>
          <form onSubmit={handleVitals} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Mạch" value={vitalsForm.pulse} onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: +e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="SpO2" value={vitalsForm.spo2} onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: +e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="HA tâm thu" value={vitalsForm.systolicBp} onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBp: +e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="HA tâm trương" value={vitalsForm.diastolicBp} onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBp: +e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.1" placeholder="Nhiệt độ" value={vitalsForm.temperature} onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: +e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            </div>
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm">Lưu</button>
          </form>
        </Modal>
      )}

      {showDiagForm && (
        <Modal title="Thêm chẩn đoán ICD-10" onClose={() => setShowDiagForm(false)}>
          <form onSubmit={handleDiag} className="space-y-3">
            <input required value={diagForm.icd10Code} onChange={(e) => setDiagForm({ ...diagForm, icd10Code: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mã ICD-10" />
            <input required value={diagForm.description} onChange={(e) => setDiagForm({ ...diagForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mô tả" />
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm">Thêm</button>
          </form>
        </Modal>
      )}

      {showRxForm && (
        <Modal title="Kê đơn thuốc" onClose={() => setShowRxForm(false)}>
          <form onSubmit={handleRx} className="space-y-3">
            <input required value={rxForm.drugName} onChange={(e) => setRxForm({ ...rxForm, drugName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tên thuốc" />
            <input required value={rxForm.dosage} onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Liều lượng" />
            <input required value={rxForm.frequency} onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tần suất" />
            <input value={rxForm.duration} onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Thời gian" />
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm">Kê đơn</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
