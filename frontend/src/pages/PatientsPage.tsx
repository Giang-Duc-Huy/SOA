import { useEffect, useState } from "react";
import { Search, Plus, Download, Eye, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchPatients, createPatient, updatePatient, fetchPatient, type Patient } from "../lib/clinical-api";

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang theo dõi", className: "bg-sky-100 text-sky-700" },
  IN_TREATMENT: { label: "Đang điều trị", className: "bg-green-100 text-green-700" },
  DISCHARGED: { label: "Đã xuất viện", className: "bg-gray-100 text-gray-600" },
  EMERGENCY: { label: "Cấp cứu", className: "bg-red-100 text-red-700" },
  RE_EXAM: { label: "Hẹn tái khám", className: "bg-amber-100 text-amber-700" },
};

const genderLabel: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function PatientsPage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "MALE",
    phone: "",
    insuranceNo: "",
  });

  const load = () => {
    if (!token) return;
    setLoading(true);
    fetchPatients(token, { q: search || undefined, status: statusFilter || undefined })
      .then((res) => {
        setPatients(res.data);
        setTotal(res.pagination.total);
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (editingPatient) {
      await updatePatient(token, editingPatient.id, form);
      setEditingPatient(null);
    } else {
      await createPatient(token, form);
      setShowForm(false);
    }
    setForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "MALE", phone: "", insuranceNo: "" });
    load();
  };

  const openEdit = async (id: string) => {
    if (!token) return;
    const patient = await fetchPatient(token, id);
    setEditingPatient(patient);
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone ?? "",
      insuranceNo: patient.insuranceNo ?? "",
    });
  };

  const openView = async (id: string) => {
    if (!token) return;
    const patient = await fetchPatient(token, id);
    setViewPatient(patient);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPatient(null);
    setForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "MALE", phone: "", insuranceNo: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Patients</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Quản lý Bệnh nhân</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách Bệnh nhân</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
            <Download size={16} />
            Xuất báo cáo
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus size={16} />
            Thêm bệnh nhân mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã BN, tên hoặc số điện thoại..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-5 py-3">Mã BN</th>
                  <th className="px-5 py-3">Họ tên</th>
                  <th className="px-5 py-3">Ngày sinh</th>
                  <th className="px-5 py-3">Giới tính</th>
                  <th className="px-5 py-3">Số điện thoại</th>
                  <th className="px-5 py-3">Lần khám cuối</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => {
                  const st = statusConfig[p.status] ?? statusConfig.ACTIVE;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4 font-mono text-primary">{p.mrn}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">{p.fullName}</p>
                        {p.insuranceNo && (
                          <p className="text-xs text-gray-400">Bảo hiểm: {p.insuranceNo}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{formatDate(p.dateOfBirth)}</td>
                      <td className="px-5 py-4 text-gray-600">{genderLabel[p.gender] ?? p.gender}</td>
                      <td className="px-5 py-4 text-gray-600">{p.phone ?? "—"}</td>
                      <td className="px-5 py-4 text-gray-600">
                        {p.lastVisitAt ? formatDate(p.lastVisitAt.split("T")[0]) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openView(p.id)}
                            className="p-1.5 text-gray-400 hover:text-primary rounded"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(p.id)}
                            className="p-1.5 text-gray-400 hover:text-primary rounded"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                      Không tìm thấy bệnh nhân
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          Hiển thị {patients.length} / {total.toLocaleString()} bệnh nhân
        </div>
      </div>

      {(showForm || editingPatient) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">
              {editingPatient ? "Chỉnh sửa bệnh nhân" : "Thêm bệnh nhân mới"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Họ" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input required placeholder="Tên" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <input required type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
            <input placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Số bảo hiểm" value={form.insuranceNo} onChange={(e) => setForm({ ...form, insuranceNo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg">
                {editingPatient ? "Cập nhật" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-3">
            <h2 className="text-lg font-semibold">Chi tiết bệnh nhân</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Mã BN:</span> <span className="font-mono text-primary">{viewPatient.mrn}</span></p>
              <p><span className="text-gray-500">Họ tên:</span> {viewPatient.fullName}</p>
              <p><span className="text-gray-500">Ngày sinh:</span> {formatDate(viewPatient.dateOfBirth)}</p>
              <p><span className="text-gray-500">Giới tính:</span> {genderLabel[viewPatient.gender] ?? viewPatient.gender}</p>
              <p><span className="text-gray-500">Điện thoại:</span> {viewPatient.phone ?? "—"}</p>
              <p><span className="text-gray-500">Bảo hiểm:</span> {viewPatient.insuranceNo ?? "—"}</p>
              <p>
                <span className="text-gray-500">Trạng thái:</span>{" "}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[viewPatient.status]?.className}`}>
                  {statusConfig[viewPatient.status]?.label ?? viewPatient.status}
                </span>
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewPatient(null)} className="px-4 py-2 text-sm text-gray-600">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
