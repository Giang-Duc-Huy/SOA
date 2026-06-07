import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: "patients:read", resource: "patients", action: "read" },
  { name: "patients:write", resource: "patients", action: "write" },
  { name: "appointments:read", resource: "appointments", action: "read" },
  { name: "appointments:write", resource: "appointments", action: "write" },
  { name: "emr:read", resource: "emr", action: "read" },
  { name: "emr:write", resource: "emr", action: "write" },
  { name: "billing:read", resource: "billing", action: "read" },
  { name: "billing:write", resource: "billing", action: "write" },
  { name: "pharmacy:read", resource: "pharmacy", action: "read" },
  { name: "pharmacy:write", resource: "pharmacy", action: "write" },
  { name: "lab:read", resource: "lab", action: "read" },
  { name: "lab:write", resource: "lab", action: "write" },
  { name: "analytics:read", resource: "analytics", action: "read" },
  { name: "users:manage", resource: "users", action: "manage" },
];

const ROLES = [
  {
    name: "ADMIN",
    description: "System administrator",
    permissions: PERMISSIONS.map((p) => p.name),
  },
  {
    name: "DOCTOR",
    description: "Clinical staff",
    permissions: [
      "patients:read",
      "patients:write",
      "appointments:read",
      "appointments:write",
      "emr:read",
      "emr:write",
      "lab:read",
      "lab:write",
      "pharmacy:read",
    ],
  },
  {
    name: "NURSE",
    description: "Nursing staff",
    permissions: ["patients:read", "appointments:read", "emr:read", "emr:write"],
  },
  {
    name: "RECEPTIONIST",
    description: "Front desk",
    permissions: ["patients:read", "patients:write", "appointments:read", "appointments:write"],
  },
  {
    name: "BILLING",
    description: "Billing department",
    permissions: ["billing:read", "billing:write", "patients:read"],
  },
];

async function main() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    for (const permName of roleDef.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const doctorRole = await prisma.role.findUnique({ where: { name: "DOCTOR" } });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mediflow.local" },
    update: {},
    create: {
      email: "admin@mediflow.local",
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      title: "ADMINISTRATOR",
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "dr.smith@mediflow.local" },
    update: {},
    create: {
      email: "dr.smith@mediflow.local",
      passwordHash,
      firstName: "Julian",
      lastName: "Smith",
      title: "CHIEF RESIDENT",
    },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }

  if (doctorRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: doctor.id, roleId: doctorRole.id } },
      update: {},
      create: { userId: doctor.id, roleId: doctorRole.id },
    });
  }

  console.log("Seed completed: admin@mediflow.local / dr.smith@mediflow.local (password: password123)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
