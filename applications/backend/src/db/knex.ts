import knex, { Knex } from "knex";
import { env } from "../config/env";

export function makeConfig(): Knex.Config {
  const common: Partial<Knex.Config> = {
    pool: { min: 0, max: 10 },
  };

  if (env.db.client === "sqlite3") {
    return {
      ...common,
      client: "sqlite3",
      connection: {
        filename: env.db.sqliteFilename,
      },
      useNullAsDefault: true,
    } satisfies Knex.Config;
  }

  return {
    ...common,
    client: "mysql2",
    connection: {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ssl: env.db.ssl ? { rejectUnauthorized: true } : undefined,
    },
  } satisfies Knex.Config;
}

export let db: Knex = knex(makeConfig());

/** @internal Test-only: swap the database connection. */
export function __setTestDb(testDb: Knex) {
  db = testDb;
}
