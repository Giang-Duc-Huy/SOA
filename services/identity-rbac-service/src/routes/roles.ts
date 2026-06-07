import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { CreateRoleSchema } from "../schemas.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("users:manage"), async (_req, res) => {
  const roles = await prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  res.json(roles);
});

router.get("/permissions", requirePermission("users:manage"), async (_req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: { resource: "asc" } });
  res.json(permissions);
});

router.post("/", requirePermission("users:manage"), async (req, res) => {
  const parsed = CreateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, description, permissionIds } = parsed.data;

  const role = await prisma.role.create({
    data: {
      name: name.toUpperCase(),
      description,
      permissions: permissionIds?.length
        ? { create: permissionIds.map((permissionId) => ({ permissionId })) }
        : undefined,
    },
    include: { permissions: { include: { permission: true } } },
  });

  res.status(201).json(role);
});

export default router;
