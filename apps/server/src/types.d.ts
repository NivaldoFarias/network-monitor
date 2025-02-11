export interface EnvironmentVariables {
    PORT: string;
    HOST: string;
    JWT_SECRET: string;
    DATABASE_PATH: string;
    NODE_ENV: "development" | "production" | "test";
    ALLOWED_ORIGINS: string;
}
