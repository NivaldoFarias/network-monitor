import { AppError, NotFoundError } from "../utils/errors";
import { Elysia, NotFoundError as ElysiaNotFoundError } from "elysia";

/**
 * Interface defining the structure of error responses
 */
export interface ErrorResponse {
	success: false;
	error: {
		message: string;
		code: string;
		statusCode: number;
	};
}

/**
 * Creates a standardized error response object
 * @param message - The error message to display
 * @param code - The error code identifier
 * @param statusCode - The HTTP status code
 */
const createErrorResponse = (message: string, code: string, statusCode: number): ErrorResponse => ({
	success: false,
	error: {
		message,
		code,
		statusCode,
	},
});

/**
 * Global error handler middleware for Elysia applications
 * Handles AppError instances, Elysia's NOT_FOUND errors, and unexpected errors
 * @param app - The Elysia application instance
 */
export const errorHandler = (app: Elysia) =>
	app.onError(({ code, error, set }): ErrorResponse => {
		console.error(error);

		// Handle AppError instances (including NotFoundError)
		if (error instanceof AppError) {
			set.status = error.statusCode;
			return createErrorResponse(error.message, error.name, error.statusCode);
		}

		// Handle Elysia's built-in NOT_FOUND errors
		if (
			code === "NOT_FOUND" ||
			error instanceof ElysiaNotFoundError ||
			error instanceof NotFoundError
		) {
			set.status = 404;

			return createErrorResponse("Resource not found", "NOT_FOUND", 404);
		}

		// Handle all other unexpected errors
		set.status = 500;
		return createErrorResponse("Internal server error", "INTERNAL_SERVER_ERROR", 500);
	});
