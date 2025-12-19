export const env = {
  port: Number(process.env.PORT ?? "3001"),

  db: {
    client: process.env.DB_CLIENT ?? "sqlite3",
    sqliteFilename: process.env.DB_SQLITE_FILENAME ?? "./data/dev.sqlite3",

    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "root",
    database: process.env.DB_DATABASE ?? "habitapp",
    ssl: process.env.DB_SSL === "true",
  },

  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:8081",

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    useEmulator: process.env.FIREBASE_USE_EMULATOR === "true",
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "localhost:9099",
  }

};
