import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StatCard } from "../components/Dashboard/StatCard";
import {
  fetchDashboardStats,
  getDemoAppointments,
  getDemoAdmissions,
  getWeeklyFlow,
  type DashboardStats,
} from "../lib/api";

const statusBadge: Record<string, string> = {
  "checked-in": "bg-green-100 text-green-700",
  upcoming: "bg-blue-100 text-blue-700",
  scheduled: "bg-gray-100 text-gray-600",
  inpatient: "bg-green-100 text-green-700",
  outpatient: "bg-sky-100 text-sky-700",
};

const statusLabel: Record<string, string> = {
  "checked-in": "Đã check-in",
  upcoming: "Sắp tới",
  scheduled: "Đã đặt",
  inpatient: "Nội trú",
  outpatient: "Ngoại trú",
};

export function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const appointments = getDemoAppointments();
  const admissions = getDemoAdmissions();
  const weeklyFlow = getWeeklyFlow();

  useEffect(() => {
    if (token) {
      fetchDashboardStats(token).then(setStats);
    }
  }, [token]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">Đang tải dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng bệnh nhân"
          value={stats.totalPatients.toLocaleString()}
          trend={stats.patientsTrend}
          trendUp
          subtext="tháng này"
        />
        <StatCard
          label="Lịch hẹn hôm nay"
          value={stats.appointmentsToday}
          subtext={`${stats.specialistExams} ca khám chuyên khoa`}
        />
        <StatCard
          label="Doanh thu tháng"
          value={stats.monthlyRevenue}
          trend={stats.revenueTrend}
          trendUp
          subtext="so với T10"
        />
        <StatCard
          label="Lấp đầy giường"
          value={`${stats.bedOccupancy}%`}
          progress={stats.bedOccupancy}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Lưu lượng bệnh nhân theo tuần</h2>
          <p className="text-xs text-gray-500 mt-1">Nội trú & Ngoại trú — 7 ngày qua</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyFlow} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="outpatient" name="Ngoại trú" fill="#91d5ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inpatient" name="Nội trú" fill="#1890FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Lịch hẹn hôm nay</h2>
            <a href="/appointments" className="text-sm text-primary hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="space-y-4">
            {appointments.map((apt, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="text-sm font-semibold text-primary w-12">{apt.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{apt.patientName}</p>
                  <p className="text-xs text-gray-500">
                    {apt.type} · {apt.room}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[apt.status]}`}>
                  {statusLabel[apt.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Bệnh nhân mới tiếp nhận</h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time data update</p>
          </div>
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            <Download size={14} />
            Xuất báo cáo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Bệnh nhân</th>
                <th className="px-5 py-3">Mã BN</th>
                <th className="px-5 py-3">Lý do khám</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Bác sĩ phụ trách</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admissions.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">{row.name}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-500">#{row.mrn}</td>
                  <td className="px-5 py-4 text-gray-600">{row.reason}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[row.status]}`}>
                      {statusLabel[row.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{row.doctor}</td>
                  <td className="px-5 py-4">
                    <button className="text-primary text-sm hover:underline">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="absolute bottom-6 right-6 w-12 h-12 bg-primary hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors">
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}
