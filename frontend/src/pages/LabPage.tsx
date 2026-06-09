import { useEffect, useState } from "react";
import { Plus, FlaskConical, FileCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchLabOrders, createLabOrder, submitLabResult, type LabOrder } from "../lib/hospital-api";
import { fetchPatients, type Patient } from "../lib/clinical-api";

const statusConfig: Record<string, { label: string; className: string }> = {
  ORDERED: { label: "Đã chỉ định", className: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "Đang thực hiện", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Hoàn thành", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-700" },
};

const typeLabels: Record<string, string> = {
  LAB: "Xét nghiệm",
  RADIOLOGY: "Chẩn đoán hình ảnh",
};

export function LabPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [resultModal, setResultModal] = useState<LabOrder | null>(null);
  const [resultText, setResultText] = useState("");
  const [form, setForm] = useState({ patientId: "", type: "LAB", testName: "" });

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchLabOrders(token), fetchPatients(token, { limit: 100 })])
      .then(([ord, pat]) => {
        setOrders(ord);
        setPatients(pat.data);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.patientId || !form.testName) return;
    await createLabOrder(token, form);
    setShowForm(false);
    setForm({ patientId: "", type: "LAB", testName: "" });
    load();
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resultModal || !resultText) return;
    await submitLabResult(token, resultModal.id, resultText);
    setResultModal(null);
    setResultText("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Lab</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Xét nghiệm & Chẩn đoán hình ảnh</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý chỉ định và kết quả xét nghiệm</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} />
          Tạo chỉ định
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
                  <th className="px-5 py-3">Loại</th>
                  <th className="px-5 py-3">Tên xét nghiệm</th>
                  <th className="px-5 py-3">Bệnh nhân</th>
                  <th className="px-5 py-3">Ngày chỉ định</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Kết quả</th>
                  <th className="px-5 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => {
                  const st = statusConfig[order.status] ?? statusConfig.ORDERED;
                  const patient = patients.find((p) => p.id === order.patientId);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <FlaskConical size={14} className="text-primary" />
                          {typeLabels[order.type] ?? order.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-800">{order.testName}</td>
                      <td className="px-5 py-4 text-gray-600">{patient?.fullName ?? order.patientId.slice(0, 8)}</td>
                      <td className="px-5 py-4 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 max-w-xs truncate">
                        {order.result ?? order.results?.[0]?.resultText ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        {order.status === "ORDERED" && (
                          <button
                            onClick={() => {
                              setResultModal(order);
                              setResultText("");
                            }}
                            className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-600"
                          >
                            <FileCheck size={14} />
                            Nhập kết quả
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      Chưa có chỉ định xét nghiệm
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
            <h2 className="text-lg font-semibold">Tạo chỉ định mới</h2>
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
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="LAB">Xét nghiệm</option>
              <option value="RADIOLOGY">Chẩn đoán hình ảnh</option>
            </select>
            <input
              required
              placeholder="Tên xét nghiệm (VD: Xét nghiệm máu tổng quát)"
              value={form.testName}
              onChange={(e) => setForm({ ...form, testName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg">
                Tạo chỉ định
              </button>
            </div>
          </form>
        </div>
      )}

      {resultModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitResult} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Nhập kết quả: {resultModal.testName}</h2>
            <textarea
              required
              rows={4}
              placeholder="Nội dung kết quả xét nghiệm..."
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setResultModal(null)} className="px-4 py-2 text-sm text-gray-600">
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg">
                Lưu kết quả
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
