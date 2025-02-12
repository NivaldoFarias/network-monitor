import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { env } from "./config/env";
import { localAuth } from "./middleware/authentication";
import { errorHandler } from "./middleware/errorHandler";
import { services } from "./routes/services";

if (import.meta.main) {
	/** Main application setup */
	const _app = new Elysia()
		.use(
			swagger({
				documentation: {
					info: {
						title: "Network Monitor API",
						version: "0.0.1",
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
		.use(errorHandler)
		.use(localAuth)
		.use(services)
		.listen({ port: env.port, hostname: env.host });

	console.log(`🚀 Server running at http://${env.host}:${env.port}`);
	console.log(`📚 API Documentation: http://${env.host}:${env.port}/swagger`);
}
