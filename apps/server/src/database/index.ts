import { env } from "../config/env";
import { Database } from "bun:sqlite";

import type { SQLQueryBindings } from "bun:sqlite";

import { schema } from "./schema";

/**
 * Database class that handles SQLite connections and operations
 */
export class DatabaseConnection {
	private static instance: DatabaseConnection;
	private readonly db: Database;

	private constructor() {
		this.db = new Database(env.databasePath);
		this.init();
	}

	/**
	 * Initializes the database schema
	 */
	private init() {
		Object.values(schema).forEach((sql) => {
			this.db.run(sql);
		});
	}

	/**
	 * Gets the singleton instance of the database
	 */
	public static getInstance() {
		if (!DatabaseConnection.instance) {
			DatabaseConnection.instance = new DatabaseConnection();
		}

		return DatabaseConnection.instance;
	}

	/**
	 * Executes a query and returns all results
	 */
	public query<T = unknown>(sql: string, _params: SQLQueryBindings[] = []) {
		return this.db.query(sql).all() as T[];
	}

	/**
	 * Executes a query and returns the first result
	 */
	public queryOne<T = unknown>(sql: string, _params: SQLQueryBindings[] = []) {
		return this.db.query(sql).get() as T | null;
	}

	/**
	 * Executes a query without returning results
	 */
	public execute(sql: string, params: SQLQueryBindings[] = []) {
		return this.db.run(sql, params);
	}

	/**
	 * Begins a new transaction
	 */
	public transaction<T>(callback: (tx: Database) => T) {
		return this.db.transaction(callback);
	}
}
