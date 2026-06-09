import { PrismaClient } from "../src/generated/client/index.js";

const prisma = new PrismaClient();

const DOCTOR_1 = "a0000000-0000-4000-8000-000000000001";
const DOCTOR_2 = "a0000000-0000-4000-8000-000000000002";
const DOCTOR_3 = "a0000000-0000-4000-8000-000000000003";
const PATIENT_1 = "b0000000-0000-4000-8000-000000000001";
const PATIENT_2 = "b0000000-0000-4000-8000-000000000002";
const PATIENT_3 = "b0000000-0000-4000-8000-000000000003";

function nextWeekday(hour: number, minute: number, dayOffset: number) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const appointments = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    patientId: PATIENT_1,
    patientName: "Nguyễn Văn An",
    doctorId: DOCTOR_1,
    doctorName: "Dr. Sarah Connor",
    scheduledAt: nextWeekday(9, 30, 0),
    department: "General Medicine",
    room: "204",
    appointmentType: "General Checkup",
    specialty: "General",
    status: "CONFIRMED",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    patientId: PATIENT_2,
    patientName: "Trần Thị Bích",
    doctorId: DOCTOR_2,
    doctorName: "Dr. James Wilson",
    scheduledAt: nextWeekday(10, 45, 1),
    department: "Dentistry",
    room: "102",
    appointmentType: "Dentistry",
    specialty: "Dentistry",
    status: "BOOKED",
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    patientId: PATIENT_3,
    patientName: "Alice Chen",
    doctorId: DOCTOR_2,
    doctorName: "Dr. James Wilson",
    scheduledAt: nextWeekday(9, 30, 2),
    department: "Cardiology",
    room: "301",
    appointmentType: "Cardiology Consultation",
    specialty: "Cardiology",
    status: "CONFIRMED",
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    patientId: PATIENT_1,
    patientName: "Robert King",
    doctorId: DOCTOR_3,
    doctorName: "Dr. Emily Blunt",
    scheduledAt: nextWeekday(10, 30, 3),
    department: "Surgery",
    room: "105",
    appointmentType: "Post-Op Review",
    specialty: "Surgery",
    status: "CANCELLED",
    cancelledAt: new Date(),
    cancelReason: "Patient rescheduled",
  },
];

async function main() {
  for (const a of appointments) {
    await prisma.appointment.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }
  console.log(`Seeded ${appointments.length} appointments`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
