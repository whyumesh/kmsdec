import jwt, { SignOptions } from "jsonwebtoken";

// Centralized JWT configuration
const JWT_SECRET: string =
  (process.env.JWT_SECRET as string) ||
  (process.env.NEXTAUTH_SECRET as string) ||
  "kms-election-fallback-secret-key-2024";

const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "24h";

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET or NEXTAUTH_SECRET environment variable is required",
  );
}

export interface JWTPayload {
  userId: string;
  role?: string;
  email?: string;
  phone?: string;
  voterId?: string;
  [key: string]: any;
}

export class JWTError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "JWTError";
  }
}

/**
 * Sign a JWT token with the given payload
 */
export function signToken(
  payload: JWTPayload,
  expiresIn: string = JWT_EXPIRES_IN,
): string {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
  } catch (error) {
    throw new JWTError("Failed to sign token", "SIGN_ERROR");
  }
}

/**
 * Verify a JWT token and return the decoded payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new JWTError("Token has expired", "TOKEN_EXPIRED");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new JWTError("Invalid token", "INVALID_TOKEN");
    } else {
      throw new JWTError("Token verification failed", "VERIFICATION_ERROR");
    }
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a token is expired without throwing an error
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}
