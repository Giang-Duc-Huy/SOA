import { PrismaClient } from "../src/generated/client/index.js";

const prisma = new PrismaClient();

const patients = [
  {
    mrn: "BN-89230",
    firstName: "Minh",
    lastName: "Nguyễn",
    dateOfBirth: new Date("1985-03-15"),
    gender: "MALE",
    phone: "0901234567",
    insuranceNo: "809241001",
    status: "IN_TREATMENT",
    lastVisitAt: new Date("2024-10-20"),
  },
  {
    mrn: "BN-88451",
    firstName: "Lan",
    lastName: "Trần",
    dateOfBirth: new Date("1958-05-12"),
    gender: "FEMALE",
    phone: "0912345678",
    insuranceNo: "809241002",
    status: "ACTIVE",
    lastVisitAt: new Date("2024-10-25"),
  },
  {
    mrn: "BN-91020",
    firstName: "Tuấn",
    lastName: "Phạm",
    dateOfBirth: new Date("1992-08-22"),
    gender: "MALE",
    phone: "0923456789",
    status: "RE_EXAM",
    lastVisitAt: new Date("2024-10-18"),
  },
  {
    mrn: "BN-90210",
    firstName: "Bích",
    lastName: "Trần",
    dateOfBirth: new Date("1975-11-03"),
    gender: "FEMALE",
    phone: "0934567890",
    status: "EMERGENCY",
    lastVisitAt: new Date("2024-10-26"),
  },
  {
    mrn: "BN-87500",
    firstName: "An",
    lastName: "Nguyễn",
    dateOfBirth: new Date("1960-01-28"),
    gender: "MALE",
    phone: "0945678901",
    status: "DISCHARGED",
    lastVisitAt: new Date("2024-09-30"),
  },
];

async function main() {
  for (const p of patients) {
    await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: p,
      create: p,
    });
  }
  console.log(`Seeded ${patients.length} patients`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
