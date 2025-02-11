import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { env } from "./config/env";
import { localAuth } from "./middleware/authentication";
import { errorHandler } from "./middleware/errorHandler";
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
		.use(errorHandler)
		.use(localAuth)
		.use(services)
		.listen({ port: env.port, hostname: env.host });

	console.log(`
🚀 Server running at http://${env.host}:${env.port}

Available routes:
📚 API Documentation: http://${env.host}:${env.port}/swagger
🔧 Services:
  GET    http://${env.host}:${env.port}/services
  GET    http://${env.host}:${env.port}/services/:name
  POST   http://${env.host}:${env.port}/services/:name/start
  POST   http://${env.host}:${env.port}/services/:name/stop 
  POST   http://${env.host}:${env.port}/services/:name/restart
  GET    http://${env.host}:${env.port}/services/:name/logs
`);
}
