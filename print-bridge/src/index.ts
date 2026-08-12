import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extractBearerToken, secretsMatch } from "./auth.js";
import { loadConfig } from "./config.js";
import { getCupsPrinterStatus } from "./cups.js";
import { printJobPayloadSchema } from "./payload.js";
import { handlePrintJob } from "./print.js";

const config = loadConfig();

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const token = extractBearerToken(req);
  if (!token || !secretsMatch(token, config.PRINT_BRIDGE_SECRET)) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return false;
  }
  return true;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const printerName = config.PRINTER_NAME.trim();
      const printer =
        config.PRINT_MODE === "print" && printerName
          ? await getCupsPrinterStatus(printerName)
          : null;
      sendJson(res, 200, {
        ok: true,
        service: "houseplant-hospital-print-bridge",
        mode: config.PRINT_MODE,
        printerConfigured: Boolean(printerName),
        printerReady: printer ? printer.ready : config.PRINT_MODE !== "print",
        printer: printer
          ? {
              name: printer.name,
              enabled: printer.enabled,
              accepting: printer.accepting,
              detail: printer.detail,
            }
          : null,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/print") {
      if (!requireAuth(req, res)) return;
      const raw = await readBody(req);
      let json: unknown;
      try {
        json = JSON.parse(raw || "{}");
      } catch {
        sendJson(res, 400, { ok: false, error: "invalid_json" });
        return;
      }
      const parsed = printJobPayloadSchema.safeParse(json);
      if (!parsed.success) {
        sendJson(res, 400, {
          ok: false,
          error: "invalid_payload",
          details: parsed.error.issues,
        });
        return;
      }
      const result = await handlePrintJob(parsed.data, config);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    sendJson(res, 404, { ok: false, error: "not_found" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal_error";
    const statusCode =
      typeof err === "object" &&
      err &&
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? ((err as { statusCode: number }).statusCode)
        : 500;
    sendJson(res, statusCode, { ok: false, error: message });
  }
});

server.listen(config.PRINT_BRIDGE_PORT, config.PRINT_BRIDGE_HOST, () => {
  console.log(
    `[print-bridge] listening on http://${config.PRINT_BRIDGE_HOST}:${config.PRINT_BRIDGE_PORT} (mode=${config.PRINT_MODE})`,
  );
});
