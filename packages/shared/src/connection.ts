import { Database } from "bun:sqlite";

import type { SQLQueryBindings } from "bun:sqlite";

import { getDatabasePath } from "./config";
import { schema } from "./schema";

/**
 * Singleton SQLite database connection manager that can be shared across the monorepo
 */
export class DatabaseConnection {
	/** The singleton instance of the database connection */
	private static instance: DatabaseConnection | null = null;

	/** The raw database instance */
	protected readonly db: Database;

	/**
	 * Create a new database connection
	 *
	 * @param databasePath - The path to the database file
	 * @returns The database connection
	 */
	public constructor(databasePath = getDatabasePath()) {
		this.db = new Database(databasePath);
		this.init();
	}

	/** Initialize database with schema and optimizations */
	private init() {
		// Enable WAL mode for better concurrency
		this.db.run("PRAGMA journal_mode = WAL");
		this.db.run("PRAGMA busy_timeout = 5000");

		// Create tables
		Object.values(schema).forEach((sql) => {
			this.db.run(sql);
		});
	}

	/**
	 * Get or create the database instance
	 *
	 * @param databasePath - The path to the database file
	 * @returns The database instance
	 */
	public static getInstance(databasePath: string) {
		if (!DatabaseConnection.instance) {
			DatabaseConnection.instance = new DatabaseConnection(databasePath);
		}

		return DatabaseConnection.instance;
	}

	/**
	 * Get the raw database instance for direct operations
	 */
	public get raw() {
		return this.db;
	}

	/**
	 * Executes a query and returns all results
	 *
	 * @param sql - The SQL query to execute
	 * @param params - The parameters to pass to the query
	 * @returns The results of the query
	 */
	public query<T>(sql: string, params: SQLQueryBindings[] = []) {
		return this.db.query(sql).all(...params) as T[];
	}

	/**
	 * Executes a query and returns the first result
	 *
	 * @param sql - The SQL query to execute
	 * @param params - The parameters to pass to the query
	 * @returns The first result of the query
	 */
	public queryOne<T>(sql: string, params: SQLQueryBindings[] = []) {
		return this.db.query(sql).get(...params) as T | null;
	}

	/**
	 * Executes a query without returning results
	 *
	 * @param sql - The SQL query to execute
	 * @param params - The parameters to pass to the query
	 */
	public execute(sql: string, params: SQLQueryBindings[] = []) {
		return this.db.run(sql, params);
	}

	/**
	 * Begins a new transaction
	 *
	 * @param callback - The callback to execute within the transaction
	 * @returns The result of the transaction
	 */
	public transaction<T>(callback: (tx: Database) => T) {
		return this.db.transaction(callback);
	}

	/**
	 * Safely close the database connection and handle any errors
	 *
	 * @throws {Error} If closing the connection fails
	 */
	public close() {
		try {
			this.db.close();
		} catch (error) {
			console.error("Error closing database:", error);
		}
	}
}

/**
 * Create a new database connection
 *
 * @param path - The path to the database file
 * @returns The database connection
 */
export const createDatabaseConnection = (path = getDatabasePath()) => {
	return DatabaseConnection.getInstance(path);
};
