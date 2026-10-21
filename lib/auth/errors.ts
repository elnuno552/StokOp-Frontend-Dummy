/** No valid session, or the account no longer exists / is inactive. */
export class AuthenticationError extends Error {
  readonly status = 401;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/** Authenticated, but the role is not allowed to perform the action. */
export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Map an error thrown inside a route handler to a JSON response.
 * Auth errors become 401/403; anything else is logged and hidden behind a 500.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
