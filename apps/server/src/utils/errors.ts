/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
	public readonly statusCode: number;

	constructor(message: string, statusCode: number = 500) {
		super(message);
		this.statusCode = statusCode;
		this.name = this.constructor.name;
	}
}

/**
 * Error class for unauthorized access attempts
 */
export class UnauthorizedError extends AppError {
	constructor(message: string = "Unauthorized") {
		super(message, 401);
	}
}

/**
 * Error class for forbidden access attempts
 */
export class ForbiddenError extends AppError {
	constructor(message: string = "Forbidden") {
		super(message, 403);
	}
}

/**
 * Error class for not found resources
 */
export class NotFoundError extends AppError {
	constructor(message: string = "Not Found") {
		super(message, 404);
	}
}

/**
 * Error class for validation errors
 */
export class ValidationError extends AppError {
	constructor(message: string = "Validation Error") {
		super(message, 400);
	}
}
