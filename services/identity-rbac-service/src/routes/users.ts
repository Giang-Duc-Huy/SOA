import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { UpdateUserSchema, AssignRolesSchema } from "../schemas.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("users:manage"), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      title: true,
      isActive: true,
      createdAt: true,
      roles: { include: { role: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    users.map((u) => ({
      ...u,
      roles: u.roles.map((ur) => ur.role),
    }))
  );
});

router.get("/:id", requirePermission("users:manage"), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

router.patch("/:id", requirePermission("users:manage"), async (req, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json(user);
});

router.put("/:id/roles", requirePermission("users:manage"), async (req, res) => {
  const parsed = AssignRolesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = req.params.id;
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    ...parsed.data.roleIds.map((roleId) =>
      prisma.userRole.create({ data: { userId, roleId } })
    ),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  res.json(user);
});

router.delete("/:id", requirePermission("users:manage"), async (req: AuthRequest, res) => {
  if (req.user?.userId === req.params.id) {
    res.status(400).json({ error: "Cannot deactivate your own account" });
    return;
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.status(204).send();
});

export default router;
