export interface ServiceRoute {
  path: string;
  target: string;
  permissions?: string[];
  public?: boolean;
}

export const SERVICE_ROUTES: ServiceRoute[] = [
  {
    path: "/api/auth",
    target: process.env.IDENTITY_SERVICE_URL ?? "http://localhost:3001",
    public: true,
  },
  {
    path: "/api/users",
    target: process.env.IDENTITY_SERVICE_URL ?? "http://localhost:3001",
    permissions: ["users:manage"],
  },
  {
    path: "/api/roles",
    target: process.env.IDENTITY_SERVICE_URL ?? "http://localhost:3001",
    permissions: ["users:manage"],
  },
  {
    path: "/api/patients",
    target: process.env.PATIENT_SERVICE_URL ?? "http://localhost:3002",
    permissions: ["patients:read"],
  },
  {
    path: "/api/appointments",
    target: process.env.APPOINTMENT_SERVICE_URL ?? "http://localhost:3003",
    permissions: ["appointments:read"],
  },
  {
    path: "/api/emr",
    target: process.env.EMR_SERVICE_URL ?? "http://localhost:3004",
    permissions: ["emr:read"],
  },
  {
    path: "/api/clinical",
    target: process.env.CLINICAL_SERVICE_URL ?? "http://localhost:3005",
    permissions: ["emr:read"],
  },
  {
    path: "/api/lab",
    target: process.env.LAB_SERVICE_URL ?? "http://localhost:3006",
    permissions: ["lab:read"],
  },
  {
    path: "/api/pharmacy",
    target: process.env.PHARMACY_SERVICE_URL ?? "http://localhost:3007",
    permissions: ["pharmacy:read"],
  },
  {
    path: "/api/billing",
    target: process.env.BILLING_SERVICE_URL ?? "http://localhost:3008",
    permissions: ["billing:read"],
  },
  {
    path: "/api/analytics",
    target: process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3009",
    permissions: ["analytics:read"],
  },
];

export const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const WRITE_PERMISSION_MAP: Record<string, string> = {
  "/api/patients": "patients:write",
  "/api/appointments": "appointments:write",
  "/api/emr": "emr:write",
  "/api/clinical": "emr:write",
  "/api/lab": "lab:write",
  "/api/pharmacy": "pharmacy:write",
  "/api/billing": "billing:write",
};
