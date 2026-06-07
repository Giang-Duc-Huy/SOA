import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { LoginSchema, RegisterUserSchema } from "../schemas.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";

const router = Router();

async function getUserWithRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
}

function extractRolesAndPermissions(user: NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>) {
  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = [
    ...new Set(
      user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.name)
      )
    ),
  ];
  return { roles, permissions };
}

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const fullUser = await getUserWithRoles(user.id);
  if (!fullUser) {
    res.status(500).json({ error: "User data unavailable" });
    return;
  }

  const { roles, permissions } = extractRolesAndPermissions(fullUser);
  const token = signToken({
    userId: user.id,
    email: user.email,
    roles,
    permissions,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      title: user.title,
      roles,
      permissions,
    },
  });
});

router.post("/register", authenticate, requirePermission("users:manage"), async (req: AuthRequest, res) => {
  const parsed = RegisterUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, firstName, lastName, title, roleIds } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      title,
      roles: roleIds?.length
        ? { create: roleIds.map((roleId) => ({ roleId })) }
        : undefined,
    },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  });
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await getUserWithRoles(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { roles, permissions } = extractRolesAndPermissions(user);
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title,
    roles,
    permissions,
  });
});

router.post("/verify", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }

  try {
    const { verifyToken } = await import("../lib/jwt.js");
    const payload = verifyToken(token);
    res.json({ valid: true, payload });
  } catch {
    res.status(401).json({ valid: false });
  }
});

export default router;
