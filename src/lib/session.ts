import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signToken, JWTError } from "./jwt";
import { logger } from "./logger";

export interface SessionData {
  userId: string;
  role: string;
  email?: string;
  phone?: string;
  voterId?: string;
  expiresAt: Date;
  lastActivity: Date;
}

export interface SessionManager {
  createSession(userData: any, expiresIn?: string): string;
  verifySession(request: NextRequest): SessionData | null;
  refreshSession(sessionData: SessionData): string;
  invalidateSession(request: NextRequest): void;
  isSessionValid(sessionData: SessionData): boolean;
}

class SessionManagerImpl implements SessionManager {
  private sessionCache = new Map<string, SessionData>();
  private readonly maxCacheSize = 1000;
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  createSession(userData: any, expiresIn: string = "24h"): string {
    if (!userData) {
      throw new Error("User data is required to create session");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.parseExpiresIn(expiresIn));

    const sessionData: SessionData = {
      userId: userData.userId || userData.id,
      role: userData.role ?? "guest",
      email: userData.email,
      phone: userData.phone,
      voterId: userData.voterId,
      expiresAt,
      lastActivity: now,
    };

    const token = signToken(
      {
        ...sessionData,
        sessionId: this.generateSessionId(),
      },
      expiresIn,
    );

    // Cache session data
    this.cacheSession(token, sessionData);

    logger.info("Session created", {
      userId: sessionData.userId,
      role: sessionData.role,
      expiresAt: sessionData.expiresAt.toISOString(),
    });

    return token;
  }

  verifySession(request: NextRequest): SessionData | null {
    try {
      // Try different token sources
      const token = this.getTokenFromRequest(request);

      if (!token) {
        return null;
      }

      // Check cache first
      const cachedSession = this.sessionCache.get(token);
      if (cachedSession && this.isSessionValid(cachedSession)) {
        // Update last activity
        cachedSession.lastActivity = new Date();
        return cachedSession;
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (jwtError) {
        return null;
      }

      const sessionData: SessionData = {
        userId: decoded.userId,
        role: decoded.role ?? "guest",
        email: decoded.email,
        phone: decoded.phone,
        voterId: decoded.voterId,
        expiresAt: new Date(decoded.exp * 1000),
        lastActivity: new Date(),
      };

      if (!this.isSessionValid(sessionData)) {
        return null;
      }

      // Cache the session
      this.cacheSession(token, sessionData);

      return sessionData;
    } catch (error) {
      logger.warn("Session verification failed", {
        error: (error as Error).message,
      });
      return null;
    }
  }

  refreshSession(sessionData: SessionData): string {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const refreshedSession: SessionData = {
      ...sessionData,
      expiresAt,
      lastActivity: now,
    };

    const token = signToken({
      ...refreshedSession,
      sessionId: this.generateSessionId(),
    });

    // Update cache
    this.cacheSession(token, refreshedSession);

    logger.info("Session refreshed", {
      userId: sessionData.userId,
      expiresAt: refreshedSession.expiresAt.toISOString(),
    });

    return token;
  }

  invalidateSession(request: NextRequest): void {
    const token = this.getTokenFromRequest(request);

    if (token) {
      this.sessionCache.delete(token);

      logger.info("Session invalidated", {
        token: token.substring(0, 10) + "...",
      });
    }
  }

  isSessionValid(sessionData: SessionData): boolean {
    const now = new Date();

    // Check if session has expired
    if (now > sessionData.expiresAt) {
      return false;
    }

    // Check if session is too old (inactivity timeout)
    const inactivityTimeout = 2 * 60 * 60 * 1000; // 2 hours
    if (
      now.getTime() - sessionData.lastActivity.getTime() >
      inactivityTimeout
    ) {
      return false;
    }

    return true;
  }

  private getTokenFromRequest(request: NextRequest): string | null {
    // Try different token sources in order of preference
    const sources = [
      () => request.cookies.get("next-auth.session-token")?.value,
      () => request.cookies.get("candidate-token")?.value,
      () => request.cookies.get("voter-token")?.value,
      () => request.headers.get("authorization")?.replace("Bearer ", ""),
      () => request.headers.get("x-auth-token"),
    ];

    for (const source of sources) {
      const token = source();
      if (token) {
        return token;
      }
    }

    return null;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private parseExpiresIn(expiresIn: string): number {
    const units: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return this.sessionTimeout;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    return value * (units[unit] || 1000);
  }

  private cacheSession(token: string, sessionData: SessionData): void {
    // Implement LRU cache eviction
    if (this.sessionCache.size >= this.maxCacheSize) {
      const oldestKey = this.sessionCache.keys().next().value;
      if (oldestKey) {
        this.sessionCache.delete(oldestKey);
      }
    }

    this.sessionCache.set(token, sessionData);
  }

  // Clean up expired sessions periodically
  cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [token, sessionData] of this.sessionCache.entries()) {
      if (!this.isSessionValid(sessionData)) {
        this.sessionCache.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info("Cleaned up expired sessions", { count: cleaned });
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManagerImpl();

// Clean up expired sessions every hour
setInterval(
  () => {
    sessionManager.cleanupExpiredSessions();
  },
  60 * 60 * 1000,
);

/**
 * Middleware to require authentication
 */
export function requireAuth(
  handler: (
    request: NextRequest,
    session: SessionData,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = sessionManager.verifySession(request);

    if (!session) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    return handler(request, session);
  };
}

/**
 * Middleware to require specific role
 */
export function requireRole(role: string) {
  return function (
    handler: (
      request: NextRequest,
      session: SessionData,
    ) => Promise<NextResponse>,
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const session = sessionManager.verifySession(request);

      if (!session) {
        return NextResponse.json(
          {
            error: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
            timestamp: new Date().toISOString(),
          },
          { status: 401 },
        );
      }

      if (session.role !== role) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      return handler(request, session);
    };
  };
}

/**
 * Helper to create session response
 */
export function createSessionResponse(
  sessionData: SessionData,
  token: string,
): NextResponse {
  const response = NextResponse.json({
    success: true,
    user: {
      id: sessionData.userId,
      role: sessionData.role,
      email: sessionData.email,
      phone: sessionData.phone,
      voterId: sessionData.voterId,
    },
    expiresAt: sessionData.expiresAt.toISOString(),
  });

  // Set appropriate cookie based on role
  const cookieName =
    sessionData.role === "ADMIN"
      ? "next-auth.session-token"
      : sessionData.role === "CANDIDATE"
        ? "candidate-token"
        : "voter-token";

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
  });

  return response;
}
