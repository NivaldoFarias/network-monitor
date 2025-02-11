import { env } from "../config/env";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { Elysia } from "elysia";

/**
 * Stores the server's authentication token
 * Generated at startup and stored in memory only
 */
const AUTH_TOKEN = crypto.randomUUID();

// Log the token only in development for testing
if (env.isDevelopment) {
	console.log("🔑 Local auth token:", AUTH_TOKEN);
}

/**
 * Validates if a request is coming from localhost
 * Checks both IPv4 (127.0.0.1) and IPv6 (::1) addresses
 *
 * @param remoteAddress The remote address to validate
 * @returns `true` if the remote address is localhost, `false` otherwise
 */
function isLocalhost(remoteAddress: string) {
	return remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "localhost";
}

/**
 * Authenticates incoming requests against local-only criteria
 *
 * Security measures:
 * 1. Only accepts requests from localhost
 * 2. Requires a valid authentication token
 * 3. Token is generated at startup and stored in memory
 * 4. Uses crypto.randomUUID() for secure token generation
 *
 * @example
 * ```typescript
 * const authResult = await authenticate(request)
 * if (!authResult.success) {
 *   return new Response("Unauthorized", { status: 401 })
 * }
 * ```
 *
 * @param request The incoming HTTP request
 * @throws {ForbiddenError} If the request is not from localhost
 * @throws {UnauthorizedError} If the authentication token is invalid
 *
 * @returns `true` if the request is authenticated, `false` otherwise
 */
export function authenticate(request: Request) {
	const remoteAddress = new URL(request.url).hostname;

	// Ensure request is from localhost
	if (!isLocalhost(remoteAddress)) {
		throw new ForbiddenError("Only localhost connections are allowed");
	}

	const authHeader = request.headers.get("Authorization");

	// Validate auth header format
	if (!authHeader?.startsWith("Bearer ")) {
		throw new UnauthorizedError("Missing or invalid authorization header");
	}

	// Extract and validate token
	const token = authHeader.split(" ")[1];
	if (token !== AUTH_TOKEN) {
		throw new UnauthorizedError("Invalid authentication token");
	}

	return { success: true };
}

/**
 * Middleware for Elysia to handle local authentication
 */
export const localAuth = (app: Elysia) =>
	app.derive(({ request }: { request: Request }) => {
		authenticate(request);

		return {};
	});
