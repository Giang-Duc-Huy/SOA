import { useEffect, useState, useMemo } from "react";
import { Plus, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchAppointments,
  bookAppointment,
  cancelAppointment,
  completeAppointment,
  type Appointment,
} from "../lib/clinical-api";

const DOCTORS = [
  { id: "a0000000-0000-4000-8000-000000000001", name: "Dr. Sarah Connor", specialty: "General" },
  { id: "a0000000-0000-4000-8000-000000000002", name: "Dr. James Wilson", specialty: "Cardiology" },
  { id: "a0000000-0000-4000-8000-000000000003", name: "Dr. Emily Blunt", specialty: "Surgery" },
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusStyle: Record<string, { stripe: string; badge: string; label: string }> = {
  BOOKED: { stripe: "border-l-blue-500", badge: "bg-blue-100 text-blue-700", label: "Pending" },
  CONFIRMED: { stripe: "border-l-green-500", badge: "bg-green-100 text-green-700", label: "Confirmed" },
  CANCELLED: { stripe: "border-l-red-500 opacity-60", badge: "bg-red-100 text-red-600", label: "Cancelled" },
  COMPLETED: { stripe: "border-l-gray-400", badge: "bg-gray-100 text-gray-600", label: "Completed" },
};

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function AppointmentsPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>(DOCTORS.map((d) => d.id));
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [showBook, setShowBook] = useState(false);
  const [form, setForm] = useState({
    patientId: "b0000000-0000-4000-8000-000000000001",
    patientName: "Nguyễn Văn An",
    doctorId: DOCTORS[0].id,
    scheduledAt: "",
    department: "General Medicine",
    appointmentType: "General Checkup",
    specialty: "General",
    room: "204",
  });

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 7);
    return e;
  }, [weekStart]);

  const load = () => {
    if (!token) return;
    fetchAppointments(token, {
      from: weekStart.toISOString(),
      to: weekEnd.toISOString(),
    })
      .then((res) => setAppointments(res.data))
      .catch(() => setAppointments([]));
  };

  useEffect(load, [token, weekStart]);

  const filtered = appointments.filter((a) => selectedDoctors.includes(a.doctorId));

  const weekDays = useMemo(() => {
    return DAYS.map((label, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { label, date: d };
    });
  }, [weekStart]);

  const getAptForSlot = (dayIndex: number, hour: number) => {
    const day = weekDays[dayIndex].date;
    return filtered.filter((a) => {
      const t = new Date(a.scheduledAt);
      return (
        t.getFullYear() === day.getFullYear() &&
        t.getMonth() === day.getMonth() &&
        t.getDate() === day.getDate() &&
        t.getHours() === hour
      );
    });
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const doctor = DOCTORS.find((d) => d.id === form.doctorId);
    await bookAppointment(token, {
      ...form,
      doctorName: doctor?.name,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    });
    setShowBook(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase">HMS / Appointments</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Calendar Schedule</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}
            className="px-3 py-2 text-sm border rounded-lg"
          >
            ← Tuần trước
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-3 py-2 text-sm border rounded-lg"
          >
            Hôm nay
          </button>
          <button
            onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}
            className="px-3 py-2 text-sm border rounded-lg"
          >
            Tuần sau →
          </button>
          <button
            onClick={() => setShowBook(true)}
            className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg"
          >
            <Plus size={16} />
            Đặt lịch mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Lọc theo Bác sĩ</h3>
          {DOCTORS.map((doc) => (
            <label key={doc.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedDoctors.includes(doc.id)}
                onChange={(e) => {
                  setSelectedDoctors((prev) =>
                    e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                  );
                }}
              />
              <span>{doc.name}</span>
            </label>
          ))}
          <div className="pt-2 border-t space-y-1 text-xs">
            <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Confirmed</p>
            <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Pending</p>
            <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Cancelled</p>
          </div>
        </div>

        <div className="xl:col-span-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-8 border-b bg-gray-50 text-xs font-semibold text-gray-500">
            <div className="p-3" />
            {weekDays.map((d) => (
              <div key={d.label} className="p-3 text-center">
                <div>{d.label}</div>
                <div className="text-gray-400">{d.date.getDate()}</div>
              </div>
            ))}
          </div>
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[72px]">
              <div className="p-2 text-xs text-gray-400 border-r">
                {hour.toString().padStart(2, "0")}:00
              </div>
              {weekDays.map((_, dayIdx) => {
                const slotApts = getAptForSlot(dayIdx, hour);
                return (
                  <div key={dayIdx} className="p-1 border-r relative">
                    {slotApts.map((apt) => {
                      const st = statusStyle[apt.status] ?? statusStyle.BOOKED;
                      return (
                        <div
                          key={apt.id}
                          className={`text-xs p-2 rounded border-l-4 bg-gray-50 mb-1 ${st.stripe}`}
                        >
                          <p className="font-medium truncate">{apt.patientName ?? "Patient"}</p>
                          <p className="text-gray-500 truncate">{apt.appointmentType}</p>
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${st.badge}`}>
                            {st.label}
                          </span>
                          {apt.status !== "CANCELLED" && apt.status !== "COMPLETED" && token && (
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => completeAppointment(token, apt.id).then(load)}
                                className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                title="Hoàn thành"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => cancelAppointment(token, apt.id).then(load)}
                                className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                                title="Hủy lịch"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showBook && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleBook} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-3">
            <h2 className="text-lg font-semibold">Đặt lịch hẹn mới</h2>
            <input required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              {DOCTORS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tên bệnh nhân" />
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Khoa" />
            <input value={form.appointmentType} onChange={(e) => setForm({ ...form, appointmentType: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Loại khám" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowBook(false)} className="px-4 py-2 text-sm">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg">Đặt lịch</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
