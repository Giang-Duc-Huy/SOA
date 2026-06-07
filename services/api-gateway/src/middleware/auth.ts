import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface GatewayUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface GatewayRequest extends Request {
  gatewayUser?: GatewayUser;
}

export function jwtAuth(requiredPermissions: string[] = []) {
  return (req: GatewayRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const token = header.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

      req.gatewayUser = {
        userId: decoded.sub as string,
        email: decoded.email as string,
        roles: (decoded.roles as string[]) ?? [],
        permissions: (decoded.permissions as string[]) ?? [],
      };

      req.headers["x-user-id"] = req.gatewayUser.userId;
      req.headers["x-user-email"] = req.gatewayUser.email;
      req.headers["x-user-roles"] = req.gatewayUser.roles.join(",");
      req.headers["x-user-permissions"] = req.gatewayUser.permissions.join(",");

      if (requiredPermissions.length > 0) {
        const hasAll = requiredPermissions.every((p) =>
          req.gatewayUser!.permissions.includes(p)
        );
        if (!hasAll) {
          res.status(403).json({ error: "Insufficient permissions", required: requiredPermissions });
          return;
        }
      }

      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
