import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function signToken(payload: Omit<JwtPayload, "sub"> & { userId: string }): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  return {
    sub: decoded.sub as string,
    email: decoded.email as string,
    roles: (decoded.roles as string[]) ?? [],
    permissions: (decoded.permissions as string[]) ?? [],
  };
}

export { JWT_SECRET };
