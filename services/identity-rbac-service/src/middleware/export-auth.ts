/**
 * Re-export auth utilities for other services to copy the same JWT verification pattern.
 * API Gateway uses its own copy in services/api-gateway/src/middleware/auth.ts
 */
export { authenticate, requirePermission, requireRole, type AuthRequest } from "./auth.js";
export { verifyToken, signToken, type JwtPayload } from "../lib/jwt.js";
