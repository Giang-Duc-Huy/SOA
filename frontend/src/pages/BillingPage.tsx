import { useEffect, useState } from "react";
import { Plus, CreditCard, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchInvoices, createInvoice, payInvoice, type Invoice } from "../lib/hospital-api";
import { fetchPatients, type Patient } from "../lib/clinical-api";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-gray-100 text-gray-600" },
  ISSUED: { label: "Chưa thanh toán", className: "bg-amber-100 text-amber-700" },
  PAID: { label: "Đã thanh toán", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-700" },
};

function formatMoney(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return n.toLocaleString("vi-VN") + " ₫";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function BillingPage() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    patientId: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchInvoices(token), fetchPatients(token, { limit: 100 })])
      .then(([inv, pat]) => {
        setInvoices(inv);
        setPatients(pat.data);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.patientId || !form.description || form.unitPrice <= 0) return;
    await createInvoice(token, {
      patientId: form.patientId,
      items: [{ description: form.description, quantity: form.quantity, unitPrice: form.unitPrice }],
    });
    setShowForm(false);
    setForm({ patientId: "", description: "", quantity: 1, unitPrice: 0 });
    load();
  };

  const handlePay = async (id: string) => {
    if (!token) return;
    setPayingId(id);
    try {
      await payInvoice(token, id, "CASH");
      load();
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Billing</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Hóa đơn & Thanh toán</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý hóa đơn và xử lý thanh toán</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} />
          Tạo hóa đơn
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-5 py-3">Mã HĐ</th>
                  <th className="px-5 py-3">Bệnh nhân</th>
                  <th className="px-5 py-3">Ngày tạo</th>
                  <th className="px-5 py-3">Tổng tiền</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const st = statusConfig[inv.status] ?? statusConfig.ISSUED;
                  const patient = patients.find((p) => p.id === inv.patientId);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{inv.id.slice(0, 8)}...</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">{patient?.fullName ?? inv.patientId.slice(0, 8)}</p>
                        {patient?.mrn && <p className="text-xs text-gray-400">{patient.mrn}</p>}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{formatDate(inv.createdAt)}</td>
                      <td className="px-5 py-4 font-medium text-gray-800">{formatMoney(inv.totalAmount)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {inv.status === "ISSUED" && (
                          <button
                            onClick={() => handlePay(inv.id)}
                            disabled={payingId === inv.id}
                            className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                          >
                            <CreditCard size={14} />
                            {payingId === inv.id ? "Đang xử lý..." : "Thanh toán"}
                          </button>
                        )}
                        {inv.status === "PAID" && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle size={14} />
                            Hoàn tất
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      Chưa có hóa đơn nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Tạo hóa đơn mới</h2>
            <select
              required
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Chọn bệnh nhân</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.mrn})
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Mô tả dịch vụ"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                min={1}
                placeholder="Số lượng"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min={1}
                placeholder="Đơn giá (₫)"
                value={form.unitPrice || ""}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg">
                Tạo hóa đơn
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
