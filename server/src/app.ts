import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db/index.js";
import itemsRouter from "./routes/items.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  initDB();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", itemsRouter);
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  });

  return app;
}
