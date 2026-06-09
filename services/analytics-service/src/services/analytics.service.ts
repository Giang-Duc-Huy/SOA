import { prisma } from "../db/prisma.js";

export const analyticsService = {
  async recordRevenue(data: { invoiceId: string; amount: number; paidAt: Date }) {
    return prisma.revenueMetric.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        paidAt: data.paidAt,
      },
    });
  },

  async recordAppointment(data: {
    appointmentId: string;
    patientId: string;
    status: string;
  }) {
    return prisma.appointmentMetric.create({ data });
  },

  async recordPharmacyStock(data: {
    medicineId: string;
    medicineName: string;
    stockQuantity: number;
    eventType: string;
  }) {
    return prisma.pharmacyMetric.create({ data });
  },

  async recordLabResult(data: {
    labOrderId: string;
    type: string;
    status: string;
  }) {
    return prisma.labMetric.create({ data });
  },

  async getRevenue() {
    const payments = await prisma.revenueMetric.findMany({
      orderBy: { paidAt: "desc" },
    });
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return { totalRevenue, payments };
  },

  async getAppointments() {
    const metrics = await prisma.appointmentMetric.findMany();
    const byStatus: Record<string, number> = {};
    for (const m of metrics) {
      byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
    }
    return { total: metrics.length, byStatus, records: metrics };
  },

  async getPharmacyStock() {
    const metrics = await prisma.pharmacyMetric.findMany({
      orderBy: { createdAt: "desc" },
    });
    const lowStockMedicines = metrics.filter((m) => m.eventType === "pharmacy.stock-low");
    return {
      totalAlerts: lowStockMedicines.length,
      lowStockMedicines,
      allRecords: metrics,
    };
  },

  async getLabResults() {
    const completed = await prisma.labMetric.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });
    return {
      completedLabResults: completed.length,
      records: completed,
    };
  },

  async getSummary() {
    const [revenue, appointments, lab, pharmacy] = await Promise.all([
      this.getRevenue(),
      this.getAppointments(),
      this.getLabResults(),
      this.getPharmacyStock(),
    ]);

    return {
      totalRevenue: revenue.totalRevenue,
      totalAppointments: appointments.total,
      completedLabResults: lab.completedLabResults,
      lowStockMedicines: pharmacy.totalAlerts,
    };
  },
};
