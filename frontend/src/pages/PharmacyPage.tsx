import { useEffect, useState, useCallback } from "react";
import { Plus, Package, Pill } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchMedicines,
  createMedicine,
  updateMedicineStock,
  fetchPharmacyPrescriptions,
  dispensePrescription,
  type Medicine,
  type PharmacyPrescription,
} from "../lib/hospital-api";
import { fetchPatients, type Patient } from "../lib/clinical-api";

const rxStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ cấp", className: "bg-amber-100 text-amber-700" },
  DISPENSED: { label: "Đã cấp", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-700" },
};

function formatMoney(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return n.toLocaleString("vi-VN") + " ₫";
}

export function PharmacyPage() {
  const { token } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<PharmacyPrescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"inventory" | "prescriptions">("inventory");
  const [showForm, setShowForm] = useState(false);
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    unit: "viên",
    stockQuantity: 100,
    lowStockThreshold: 10,
    price: 10000,
  });

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchMedicines(token),
      fetchPharmacyPrescriptions(token),
      fetchPatients(token, { limit: 100 }),
    ])
      .then(([med, rx, pat]) => {
        setMedicines(med);
        setPrescriptions(rx);
        setPatients(pat.data);
      })
      .catch((e) => {
        setMedicines([]);
        setPrescriptions([]);
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createMedicine(token, form);
      setShowForm(false);
      setForm({ name: "", unit: "viên", stockQuantity: 100, lowStockThreshold: 10, price: 10000 });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thêm thuốc thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDispense = async (id: string) => {
    if (!token) return;
    setDispensingId(id);
    setError(null);
    try {
      await dispensePrescription(token, id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cấp thuốc thất bại");
    } finally {
      setDispensingId(null);
    }
  };

  const handleUpdateStock = async (id: string, current: number) => {
    if (!token) return;
    const qty = prompt("Nhập số lượng tồn kho mới:", String(current));
    if (qty === null) return;
    const n = parseInt(qty, 10);
    if (isNaN(n) || n < 0) return;
    try {
      await updateMedicineStock(token, id, n);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật tồn kho thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Pharmacy</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Quản lý Nhà thuốc</h1>
          <p className="text-sm text-gray-500 mt-1">Kho thuốc và cấp phát đơn thuốc</p>
        </div>
        {tab === "inventory" && (
          <button
            onClick={() => { setShowForm(true); setError(null); }}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus size={16} />
            Thêm thuốc
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("inventory")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "inventory" ? "border-primary text-primary" : "border-transparent text-gray-500"
          }`}
        >
          <Package size={16} className="inline mr-2" />
          Kho thuốc
        </button>
        <button
          onClick={() => setTab("prescriptions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "prescriptions" ? "border-primary text-primary" : "border-transparent text-gray-500"
          }`}
        >
          <Pill size={16} className="inline mr-2" />
          Đơn thuốc
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Đang tải...</div>
      ) : tab === "inventory" ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-5 py-3">Tên thuốc</th>
                <th className="px-5 py-3">Đơn vị</th>
                <th className="px-5 py-3">Tồn kho</th>
                <th className="px-5 py-3">Ngưỡng cảnh báo</th>
                <th className="px-5 py-3">Giá</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {medicines.map((m) => {
                const isLow = m.stockQuantity <= m.lowStockThreshold;
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-medium text-gray-800">{m.name}</td>
                    <td className="px-5 py-4 text-gray-600">{m.unit}</td>
                    <td className="px-5 py-4">
                      <span className={`font-medium ${isLow ? "text-red-600" : "text-gray-800"}`}>
                        {m.stockQuantity}
                        {isLow && <span className="ml-2 text-xs text-red-500">(Sắp hết)</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{m.lowStockThreshold}</td>
                    <td className="px-5 py-4 text-gray-600">{formatMoney(m.price)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleUpdateStock(m.id, m.stockQuantity)}
                        className="text-xs text-primary hover:underline"
                      >
                        Cập nhật tồn
                      </button>
                    </td>
                  </tr>
                );
              })}
              {medicines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Chưa có thuốc trong kho
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-5 py-3">Bệnh nhân</th>
                <th className="px-5 py-3">Thuốc</th>
                <th className="px-5 py-3">Ngày tạo</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prescriptions.map((rx) => {
                const st = rxStatusConfig[rx.status] ?? rxStatusConfig.PENDING;
                const patient = patients.find((p) => p.id === rx.patientId);
                return (
                  <tr key={rx.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 text-gray-700">{patient?.fullName ?? rx.patientId.slice(0, 8)}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {rx.items.map((item) => (
                          <p key={item.id} className="text-gray-600">
                            {item.medicine.name} × {item.quantity}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {new Date(rx.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {rx.status === "PENDING" && (
                        <button
                          onClick={() => handleDispense(rx.id)}
                          disabled={dispensingId === rx.id}
                          className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                          {dispensingId === rx.id ? "Đang cấp..." : "Cấp thuốc"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {prescriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    Chưa có đơn thuốc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Thêm thuốc mới</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tên thuốc *</label>
              <input
                required
                placeholder="VD: Paracetamol 500mg"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Đơn vị</label>
                <input
                  required
                  placeholder="viên"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Giá (₫)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tồn kho</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ngưỡng cảnh báo</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Thêm thuốc"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
