import { useEffect, useState } from "react";
import { Plus, Printer, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchEncounters,
  fetchEncounterSummary,
  recordVitals,
  addDiagnosis,
  addPrescription,
  type Encounter,
  type VitalSign,
  type Diagnosis,
  type Prescription,
} from "../lib/clinical-api";

const statusBadge: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export function EMRPage() {
  const { token } = useAuth();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selected, setSelected] = useState<Encounter | null>(null);
  const [vitals, setVitals] = useState<VitalSign | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showDiagForm, setShowDiagForm] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);

  const [vitalsForm, setVitalsForm] = useState({ pulse: 78, systolicBp: 128, diastolicBp: 82, temperature: 36.8, spo2: 98 });
  const [diagForm, setDiagForm] = useState({ icd10Code: "I10", description: "Tăng huyết áp", isPrimary: true });
  const [rxForm, setRxForm] = useState({ drugName: "Amlodipine", dosage: "5mg", frequency: "1 lần/ngày", duration: "30 ngày" });

  useEffect(() => {
    if (!token) return;
    fetchEncounters(token).then((res) => {
      setEncounters(res.data);
      if (res.data.length > 0 && !selected) setSelected(res.data[0]);
    }).catch(() => setEncounters([]));
  }, [token]);

  useEffect(() => {
    if (!token || !selected) return;
    fetchEncounterSummary(token, selected.id).then((s) => {
      setVitals(s.vitals);
      setDiagnoses(s.diagnoses);
      setPrescriptions(s.prescriptions);
    }).catch(() => {});
  }, [token, selected]);

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
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm">
            <Printer size={16} /> In EMR
          </button>
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm">
            <Pencil size={16} /> Chỉnh sửa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold mb-3">Bệnh án nháp</h3>
          <div className="space-y-2">
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
                  {enc.status}
                </span>
              </button>
            ))}
            {encounters.length === 0 && (
              <p className="text-sm text-gray-400">Chưa có bệnh án. Hoàn thành lịch hẹn để tự động tạo nháp.</p>
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
                    <p className="text-sm text-gray-500">Encounter #{selected.id.slice(0, 8)} · {selected.department}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadge[selected.status]}`}>
                    {selected.status === "DRAFT" ? "Bản nháp" : selected.status}
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
              Chọn một bệnh án để xem chi tiết
            </div>
          )}
        </div>
      </div>

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
