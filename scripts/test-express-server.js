/**
 * Test server for the NCC Express router.
 * Run: npm run dev:server (proxy) or npm run dev:mock (mock, no upstream)
 * Then run: npm run dev (in another terminal)
 * Vite proxies /ncc to this server for same-origin testing.
 */

import express from "express";
import expressWs from "express-ws";
import {
  createBankVerificationRouter,
  createProxyHandlers,
  createMockHandlers,
} from "../dist/express-router.js";

const PORT = 3001;
const USE_MOCK = process.env.NCC_MOCK === "true";
const UPSTREAM = process.env.NCC_UPSTREAM || "https://srv1462130.hstgr.cloud";

const app = express();
expressWs(app);
app.use(express.json());

const handlers = USE_MOCK
  ? createMockHandlers()
  : createProxyHandlers(UPSTREAM);
const { router, registerWebSocket } = createBankVerificationRouter(handlers);

app.use(router);
registerWebSocket(app);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`NCC server running at http://localhost:${PORT}`);
  console.log(`  Routes: /ncc/v1/channels/..., /ncc/v1/bins/lookup, /ncc/v1/.../ws`);
  if (USE_MOCK) {
    console.log(`  Mode: MOCK (no upstream)`);
  } else {
    console.log(`  Mode: PROXY → ${UPSTREAM}`);
  }
  console.log(`  Mock: NCC_MOCK=true npm run dev:server`);
  console.log(`  Custom upstream: NCC_UPSTREAM=<url> npm run dev:server`);
});
