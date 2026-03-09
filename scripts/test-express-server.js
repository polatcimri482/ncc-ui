/**
 * Test server for the NCC Express router.
 * Run: npm run dev:server
 * Then run: npm run dev (in another terminal)
 * Vite proxies /ncc to this server for same-origin testing.
 */

import express from "express";
import expressWs from "express-ws";
import {
  createBankVerificationRouter,
  createProxyHandlers,
} from "../dist/express-router.js";

const PORT = 3001;
const UPSTREAM = process.env.NCC_UPSTREAM || "https://srv1462130.hstgr.cloud";

const app = express();
expressWs(app);
app.use(express.json());

const handlers = createProxyHandlers(UPSTREAM);
const { router, registerWebSocket } = createBankVerificationRouter(handlers);

app.use(router);
registerWebSocket(app);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`NCC proxy server running at http://localhost:${PORT}`);
  console.log(`  Routes: /ncc/v1/channels/..., /ncc/v1/bins/lookup, /ncc/v1/.../ws`);
  console.log(`  Upstream: ${UPSTREAM}`);
  console.log(`  Use with: NCC_UPSTREAM=<url> npm run dev:server`);
});
