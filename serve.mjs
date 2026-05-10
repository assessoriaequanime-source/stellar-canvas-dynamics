import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import app from "./dist/server/server.js";

const port = parseInt(process.env.PORT || "8080");
const clientDir = join(fileURLToPath(import.meta.url), "..", "dist", "client");

const mimeTypes = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

createServer(async (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "singulai.live";
  const urlPath = req.url.split("?")[0];

  // Serve static files from dist/client
  const filePath = join(clientDir, urlPath);
  try {
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      const mime = mimeTypes[ext] || "application/octet-stream";
      const body = readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000",
      });
      res.end(body);
      return;
    }
  } catch (_) {}

  // SSR for everything else
  const url = `${proto}://${host}${req.url}`;
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }

  let body = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  try {
    const request = new Request(url, { method: req.method, headers, body });
    const response = await app.fetch(request);
    const resHeaders = {};
    response.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });
    res.writeHead(response.status, resHeaders);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error("[singulai-live-dashboard]", e);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`singulai-live-dashboard listening on port ${port}`);
});
