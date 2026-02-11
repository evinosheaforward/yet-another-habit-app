import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { initFirebaseAdmin } from "./auth/firebase";
import { requireAuth } from "./auth/requireAuth";
import activitiesRoutes from "./routes/activities";

initFirebaseAdmin();

const app = express();

app.use(
  cors({
    origin: env.corsOrigin, 
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Important for preflight requests
app.options("*", cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(requireAuth);
app.use(activitiesRoutes);

// Global error handler — catches unhandled errors in route handlers
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
