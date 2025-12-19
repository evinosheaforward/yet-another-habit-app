import "dotenv/config";
import path from "path";
import type { Knex } from "knex";

const client = process.env.DB_CLIENT ?? "sqlite3";

const migrations: Knex.MigratorConfig = {
  directory: path.resolve("./migrations"),
  tableName: "knex_migrations",
};

const config: Knex.Config =
  client === "sqlite3"
    ? {
        client: "sqlite3",
        connection: { filename: process.env.DB_SQLITE_FILENAME ?? "./data/dev.sqlite3" },
        useNullAsDefault: true,
        migrations,
      }
    : {
        client: "mysql2",
        connection: {
          host: process.env.DB_HOST ?? "127.0.0.1",
          port: Number(process.env.DB_PORT ?? 3306),
          user: process.env.DB_USER ?? "root",
          password: process.env.DB_PASSWORD ?? "root",
          database: process.env.DB_DATABASE ?? "habitapp",
          ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
        },
        pool: { min: 0, max: 10 },
        migrations,
      };

export default config;
