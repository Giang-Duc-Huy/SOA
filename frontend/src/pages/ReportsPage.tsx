import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Calendar, FlaskConical, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchAnalyticsSummary, type AnalyticsSummary } from "../lib/hospital-api";
import { StatCard } from "../components/Dashboard/StatCard";

const PIE_COLORS = ["#1890FF", "#52c41a", "#faad14", "#ff4d4f", "#722ed1"];

const statusLabels: Record<string, string> = {
  BOOKED: "Đã đặt",
  CONFIRMED: "Xác nhận",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export function ReportsPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchAnalyticsSummary(token)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">Đang tải báo cáo...</div>
      </div>
    );
  }

  const appointmentChart = summary?.appointmentsByStatus
    ? Object.entries(summary.appointmentsByStatus).map(([status, count]) => ({
        name: statusLabels[status] ?? status,
        value: count,
      }))
    : [];

  const revenueChart = (summary?.revenuePayments ?? []).slice(0, 7).map((p, i) => ({
    day: `T${i + 1}`,
    revenue: Number(p.amount),
  }));

  const formattedRevenue =
    (summary?.totalRevenue ?? 0) >= 1_000_000
      ? `${((summary?.totalRevenue ?? 0) / 1_000_000).toFixed(1)}M ₫`
      : `${(summary?.totalRevenue ?? 0).toLocaleString()} ₫`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Reports</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Báo cáo & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng quan hoạt động bệnh viện</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng doanh thu"
          value={formattedRevenue}
          trend={summary?.totalRevenue ? "+5.4%" : undefined}
          trendUp
          subtext="tích lũy"
        />
        <StatCard
          label="Tổng lịch hẹn"
          value={summary?.totalAppointments ?? 0}
          subtext="tất cả trạng thái"
        />
        <StatCard
          label="Xét nghiệm hoàn thành"
          value={summary?.completedLabResults ?? 0}
          subtext="lab & chẩn đoán hình ảnh"
        />
        <StatCard
          label="Cảnh báo tồn kho"
          value={summary?.lowStockMedicines ?? 0}
          subtext="thuốc sắp hết"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-gray-800">Lịch hẹn theo trạng thái</h2>
          </div>
          {appointmentChart.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={appointmentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {appointmentChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Chưa có dữ liệu lịch hẹn
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-gray-800">Doanh thu gần đây</h2>
          </div>
          {revenueChart.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ₫`, "Doanh thu"]} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#1890FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Chưa có dữ liệu thanh toán
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-gray-800">Xét nghiệm gần đây</h2>
          </div>
          <div className="space-y-3">
            {(summary?.labRecords ?? []).slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{r.type}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{r.status}</span>
              </div>
            ))}
            {(summary?.labRecords ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu xét nghiệm</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-gray-800">Cảnh báo tồn kho thuốc</h2>
          </div>
          <div className="space-y-3">
            {(summary?.pharmacyAlerts ?? []).slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{a.medicineName}</span>
                <span className="text-xs text-red-600 font-medium">Còn {a.stockQuantity}</span>
              </div>
            ))}
            {(summary?.pharmacyAlerts ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Không có cảnh báo tồn kho</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
