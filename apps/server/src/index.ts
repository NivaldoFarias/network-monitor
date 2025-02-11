import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { env } from "./config/env";
import { localAuth } from "./middleware/local-auth";
import { services } from "./routes/services";
import { AppError } from "./utils/errors";

if (import.meta.main) {
	/** Main application setup */
	const app = new Elysia()
		.use(
			swagger({
				documentation: {
					info: {
						title: "Network Monitor API",
						version: "1.0.0",
						description: "Local API for managing network monitoring services",
					},
					components: {
						securitySchemes: {
							bearerAuth: {
								type: "http",
								scheme: "bearer",
							},
						},
					},
					security: [{ bearerAuth: [] }],
				},
			}),
		)
		.use(localAuth)
		.use(services)
		.onError(({ error, set }) => {
			console.error(error);

			if (error instanceof AppError) {
				set.status = error.statusCode;
				return { error: error.message, statusCode: error.statusCode };
			}

			set.status = 500;
			return { error: "Internal Server Error", statusCode: 500 };
		})
		.listen({ port: env.port, hostname: env.host });

	console.log(`🚀 Server running at http://${env.host}:${env.port}`);
	console.log("📚 API documentation available at /swagger");
}
