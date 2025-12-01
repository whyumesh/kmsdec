import { NextResponse } from "next/server";
import { logger, LogContext } from "./logger";
import { ZodError } from "zod";
import { JWTError } from "./jwt";

export interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  context?: LogContext;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = "VALIDATION_ERROR";
  isOperational = true;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "ValidationError";
    this.context = context;
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = "AUTHENTICATION_ERROR";
  isOperational = true;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "AuthenticationError";
    this.context = context;
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = "AUTHORIZATION_ERROR";
  isOperational = true;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "AuthorizationError";
    this.context = context;
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = "NOT_FOUND_ERROR";
  isOperational = true;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "NotFoundError";
    this.context = context;
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = "CONFLICT_ERROR";
  isOperational = true;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "ConflictError";
    this.context = context;
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = "RATE_LIMIT_ERROR";
  isOperational = true;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "RateLimitError";
    this.context = context;
  }
}

export class InternalServerError extends Error implements AppError {
  statusCode = 500;
  code = "INTERNAL_SERVER_ERROR";
  isOperational = false;
  context?: LogContext;

  constructor(message: string, context?: LogContext) {
    super(message);
    this.name = "InternalServerError";
    this.context = context;
  }
}

/**
 * Handle different types of errors and return appropriate responses
 */
export function handleError(
  error: unknown,
  context?: LogContext,
): NextResponse {
  // Log the error
  if (error instanceof Error) {
    logger.logError(error, "API Error occurred", context);
  } else {
    logger.error("Unknown error occurred", { context });
  }

  // Handle known error types
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        retryAfter: 60,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: validationErrors,
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  // Handle JWT errors
  if (error instanceof JWTError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: 401 },
    );
  }

  // Handle Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        return NextResponse.json(
          {
            error: "A record with this information already exists",
            code: "DUPLICATE_RECORD",
            timestamp: new Date().toISOString(),
          },
          { status: 409 },
        );

      case "P2025":
        return NextResponse.json(
          {
            error: "Record not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          },
          { status: 404 },
        );

      case "P2003":
        return NextResponse.json(
          {
            error: "Foreign key constraint failed",
            code: "FOREIGN_KEY_ERROR",
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );

      default:
        // logger.error('Unhandled Prisma error', context, error)
        return NextResponse.json(
          {
            error: "Database operation failed",
            code: "DATABASE_ERROR",
            timestamp: new Date().toISOString(),
          },
          { status: 500 },
        );
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "An unexpected error occurred"
            : error.message,
        code: "INTERNAL_SERVER_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  );
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  code: string = "ERROR",
  details?: any,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  statusCode: number = 200,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  );
}
