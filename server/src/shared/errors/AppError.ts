export class AppError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  public static badRequest(message: string, details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  public static unauthorized(message = "Authentication required.") {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  public static forbidden(message = "You are not allowed to perform this action.") {
    return new AppError(403, "FORBIDDEN", message);
  }

  public static notFound(resource = "Resource") {
    return new AppError(404, "NOT_FOUND", `${resource} was not found.`);
  }

  public static conflict(message: string, details?: unknown) {
    return new AppError(409, "CONFLICT", message, details);
  }

  public static tooManyRequests(message = "Too many requests. Please try again later.") {
    return new AppError(429, "TOO_MANY_REQUESTS", message);
  }

  public static badGateway(message: string, details?: unknown) {
    return new AppError(502, "BAD_GATEWAY", message, details);
  }

  public static serviceUnavailable(message: string, details?: unknown) {
    return new AppError(503, "SERVICE_UNAVAILABLE", message, details);
  }
}
