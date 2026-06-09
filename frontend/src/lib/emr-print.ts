import type { Encounter, VitalSign, Diagnosis, Prescription, Patient } from "./clinical-api";

export interface EmrPrintData {
  encounter: Encounter;
  patient?: Patient | null;
  vitals: VitalSign | null;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  doctorName?: string;
  doctorTitle?: string;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang điều trị",
  COMPLETED: "Hoàn thành",
};

function esc(s: string | undefined | null) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

function genderLabel(g?: string) {
  if (g === "MALE") return "Nam";
  if (g === "FEMALE") return "Nữ";
  return g ?? "—";
}

export function buildEmrPrintHtml(data: EmrPrintData): string {
  const { encounter, patient, vitals, diagnoses, prescriptions, doctorName, doctorTitle } = data;
  const printedAt = new Date().toLocaleString("vi-VN");
  const status = STATUS_LABEL[encounter.status] ?? encounter.status;

  const vitalsRows = vitals
    ? `<tr>
        <td>${vitals.pulse ?? "—"}</td>
        <td>${vitals.systolicBp ?? "—"}/${vitals.diastolicBp ?? "—"}</td>
        <td>${vitals.temperature ?? "—"}</td>
        <td>${vitals.spo2 ?? "—"}%</td>
      </tr>`
    : `<tr><td colspan="4" class="empty">Chưa ghi nhận sinh hiệu</td></tr>`;

  const diagRows =
    diagnoses.length > 0
      ? diagnoses
          .map(
            (d, i) =>
              `<tr>
                <td class="center">${i + 1}</td>
                <td class="mono">${esc(d.icd10Code)}</td>
                <td>${esc(d.description)}</td>
                <td class="center">${d.isPrimary ? "✓" : ""}</td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty">Chưa có chẩn đoán</td></tr>`;

  const rxRows =
    prescriptions.length > 0
      ? prescriptions
          .map(
            (r, i) =>
              `<tr>
                <td class="center">${i + 1}</td>
                <td><strong>${esc(r.drugName)}</strong> ${esc(r.dosage)}</td>
                <td>${esc(r.frequency)}</td>
                <td>${esc(r.duration ?? "—")}</td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty">Chưa có đơn thuốc</td></tr>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>EMR — ${esc(encounter.patientName)}</title>
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      line-height: 1.45;
      background: #fff;
    }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 3px solid #1890ff;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .hospital-logo {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #1890ff, #096dd9);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 18px;
      flex-shrink: 0;
    }
    .hospital-info { flex: 1; margin-left: 14px; }
    .hospital-info h1 {
      font-size: 15pt; font-weight: 700; color: #1890ff;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .hospital-info p { font-size: 9pt; color: #666; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 9pt; color: #666; }
    .doc-meta .doc-id {
      font-family: monospace; font-size: 10pt; color: #1890ff;
      font-weight: 600; margin-top: 4px;
    }

    /* Title bar */
    .title-bar {
      background: #f0f7ff;
      border: 1px solid #bae0ff;
      border-radius: 6px;
      padding: 10px 14px;
      text-align: center;
      margin-bottom: 16px;
    }
    .title-bar h2 {
      font-size: 13pt; font-weight: 700; color: #003a8c;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .title-bar .status-badge {
      display: inline-block; margin-top: 4px;
      padding: 2px 12px; border-radius: 12px;
      font-size: 9pt; font-weight: 600;
      background: ${encounter.status === "COMPLETED" ? "#d4edda" : encounter.status === "ACTIVE" ? "#cce5ff" : "#fff3cd"};
      color: ${encounter.status === "COMPLETED" ? "#155724" : encounter.status === "ACTIVE" ? "#004085" : "#856404"};
    }

    /* Section */
    .section { margin-bottom: 14px; }
    .section-title {
      font-size: 10pt; font-weight: 700; color: #1890ff;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #e8e8e8;
      padding-bottom: 4px; margin-bottom: 8px;
    }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      font-size: 10pt;
    }
    .info-grid .label { color: #888; font-size: 9pt; }
    .info-grid .value { font-weight: 500; }

    /* Complaint box */
    .complaint-box {
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 10pt;
    }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th {
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      color: #555;
      text-transform: uppercase;
    }
    td {
      border: 1px solid #e8e8e8;
      padding: 6px 8px;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #fafafa; }
    .center { text-align: center; }
    .mono { font-family: "Consolas", monospace; color: #1890ff; font-weight: 600; }
    .empty { text-align: center; color: #bbb; font-style: italic; }

    /* Summary */
    .summary-box {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 10pt;
    }

    /* Signature */
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      padding-top: 16px;
    }
    .sig-block { text-align: center; width: 200px; }
    .sig-block .sig-line {
      border-top: 1px solid #333;
      margin-top: 48px;
      padding-top: 6px;
      font-size: 10pt;
      font-weight: 600;
    }
    .sig-block .sig-sub { font-size: 8pt; color: #888; margin-top: 2px; }

    /* Footer */
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #aaa;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-logo">MF</div>
    <div class="hospital-info">
      <h1>Bệnh viện Đa khoa City General</h1>
      <p>MediFlow HMS — Hệ thống Quản lý Bệnh viện</p>
      <p>123 Đường Y Tế, Quận 1, TP. Hồ Chí Minh · ĐT: (028) 3822 1234</p>
    </div>
    <div class="doc-meta">
      <div>Mã bệnh án</div>
      <div class="doc-id">${esc(encounter.id.slice(0, 8).toUpperCase())}</div>
      <div style="margin-top:6px">Ngày tạo: ${formatDate(encounter.createdAt)}</div>
    </div>
  </div>

  <div class="title-bar">
    <h2>Hồ sơ Bệnh án Điện tử (EMR)</h2>
    <span class="status-badge">${esc(status)}</span>
  </div>

  <div class="section">
    <div class="section-title">I. Thông tin bệnh nhân</div>
    <div class="info-grid">
      <div><div class="label">Họ và tên</div><div class="value">${esc(encounter.patientName ?? patient?.fullName ?? "—")}</div></div>
      <div><div class="label">Mã bệnh nhân (MRN)</div><div class="value">${esc(patient?.mrn ?? "—")}</div></div>
      <div><div class="label">Ngày sinh</div><div class="value">${formatDate(patient?.dateOfBirth)}</div></div>
      <div><div class="label">Giới tính</div><div class="value">${genderLabel(patient?.gender)}</div></div>
      <div><div class="label">Khoa điều trị</div><div class="value">${esc(encounter.department ?? "—")}</div></div>
      <div><div class="label">Điện thoại</div><div class="value">${esc(patient?.phone ?? "—")}</div></div>
      <div><div class="label">Bác sĩ phụ trách</div><div class="value">${esc(encounter.doctorName ?? doctorName ?? "—")}</div></div>
      <div><div class="label">BHYT / Bảo hiểm</div><div class="value">${esc(patient?.insuranceNo ?? "—")}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">II. Lý do khám & Triệu chứng</div>
    <div class="complaint-box">${esc(encounter.chiefComplaint ?? "Không ghi nhận")}</div>
  </div>

  <div class="section">
    <div class="section-title">III. Sinh hiệu</div>
    <table>
      <thead>
        <tr>
          <th>Mạch (bpm)</th>
          <th>Huyết áp (mmHg)</th>
          <th>Nhiệt độ (°C)</th>
          <th>SpO₂ (%)</th>
        </tr>
      </thead>
      <tbody>${vitalsRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">IV. Chẩn đoán (ICD-10)</div>
    <table>
      <thead>
        <tr><th style="width:40px">STT</th><th style="width:90px">Mã ICD-10</th><th>Mô tả chẩn đoán</th><th style="width:60px">Chính</th></tr>
      </thead>
      <tbody>${diagRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">V. Đơn thuốc</div>
    <table>
      <thead>
        <tr><th style="width:40px">STT</th><th>Tên thuốc & Liều lượng</th><th>Tần suất</th><th>Thời gian</th></tr>
      </thead>
      <tbody>${rxRows}</tbody>
    </table>
  </div>

  ${
    encounter.summary
      ? `<div class="section">
          <div class="section-title">VI. Tóm tắt bệnh án</div>
          <div class="summary-box">${esc(encounter.summary)}</div>
        </div>`
      : ""
  }

  <div class="signature-row">
    <div class="sig-block">
      <div class="sig-line">Bệnh nhân / Người nhà</div>
      <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${esc(doctorName ?? "Bác sĩ điều trị")}</div>
      <div class="sig-sub">${esc(doctorTitle ?? "Bác sĩ")}</div>
    </div>
  </div>

  <div class="footer">
    <span>MediFlow HMS — Bệnh viện Đa khoa City General</span>
    <span>In lúc: ${printedAt}</span>
  </div>
</body>
</html>`;
}

export function printEmrDocument(data: EmrPrintData) {
  const html = buildEmrPrintHtml(data);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Trình duyệt chặn cửa sổ in. Vui lòng cho phép popup.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
}
