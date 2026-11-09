export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status ?? DEFAULT_STATUS[code];
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export const unauthenticated = (message = "Sign in to continue"): AppError =>
  new AppError("UNAUTHENTICATED", message);

export const forbidden = (message = "You do not have permission to do that"): AppError =>
  new AppError("FORBIDDEN", message);

export const notFound = (message = "Not found"): AppError =>
  new AppError("NOT_FOUND", message);

export const conflict = (message: string): AppError => new AppError("CONFLICT", message);

export const validation = (message: string, details?: unknown): AppError =>
  new AppError("VALIDATION", message, undefined, details);

export const rateLimited = (message = "Too many attempts. Try again shortly."): AppError =>
  new AppError("RATE_LIMITED", message);
