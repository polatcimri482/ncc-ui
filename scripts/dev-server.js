/**
 * Merged dev server: Express (NCC API) + Vite (preview app) on a single port.
 * Run: npm run dev
 *
 * - NCC API routes: /ncc/v1/...
 * - Preview app: / (Vite HMR, etc.)
 */

import http from "http";
import express from "express";
import expressWs from "express-ws";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  createBankVerificationRouter,
  createProxyHandlers,
} from "../dist/express-router.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PORT = parseInt(process.env.PORT || "5173", 10);
const UPSTREAM = process.env.NCC_UPSTREAM || "https://srv1462130.hstgr.cloud";

const app = express();
const server = http.createServer(app);
expressWs(app, server);
app.use(express.json());

// NCC API (must be before Vite so /ncc routes hit Express)
const handlers = createProxyHandlers(UPSTREAM);
const { router, registerWebSocket } = createBankVerificationRouter(handlers);
app.use(router);
registerWebSocket(app);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Vite dev server (handles preview app, HMR; parent server for WebSocket)
const vite = await createViteServer({
  configFile: join(root, "vite.config.ts"),
  server: { middlewareMode: { server } },
});
app.use(vite.middlewares);

server.listen(PORT, () => {
  console.log(`\n  Dev server: http://localhost:${PORT}/`);
  console.log(`  NCC API:    http://localhost:${PORT}/ncc/v1/...`);
  console.log(`  Upstream:   ${UPSTREAM} (override: NCC_UPSTREAM=<url> npm run dev)\n`);
});
