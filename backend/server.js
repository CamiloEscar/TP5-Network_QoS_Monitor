"use strict";

const crypto = require("node:crypto");
const { Readable, pipeline } = require("node:stream");
const express = require("express");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const VERSION = require("./package.json").version;

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const CHUNK_BYTES = 64 * 1024;

const app = express();
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    ok: true,
    uptime: process.uptime(),
    version: VERSION,
    ts: Date.now(),
  });
});

app.get("/ping", (req, res) => {
  res.json({ ts: Date.now() });
});

function parseBytesParam(raw) {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0 || n > MAX_BYTES) return null;
  return n;
}

function* randomChunks(total) {
  let remaining = total;
  while (remaining > 0) {
    const size = Math.min(CHUNK_BYTES, remaining);
    remaining -= size;
    yield crypto.randomBytes(size);
  }
}

app.get("/download/:bytes", (req, res) => {
  const n = parseBytesParam(req.params.bytes);
  if (n === null) {
    res.status(400).json({
      error: `invalid :bytes — expected an integer in 1..${MAX_BYTES}`,
    });
    return;
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", String(n));
  res.setHeader("Cache-Control", "no-store");
  pipeline(Readable.from(randomChunks(n)), res, () => {});
});

app.post("/upload", (req, res) => {
  const echo = req.query.echo === "1";
  let received = 0;
  let tooLarge = false;

  if (echo) {
    res.status(200);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
  }

  req.on("data", (chunk) => {
    if (tooLarge) return;
    received += chunk.length;
    if (received > MAX_UPLOAD_BYTES) {
      tooLarge = true;
      if (!res.headersSent) {
        res
          .status(413)
          .json({ error: `payload too large — max ${MAX_UPLOAD_BYTES} bytes` });
      }
      req.destroy();
      return;
    }
    if (echo) res.write(chunk);
  });

  req.on("end", () => {
    if (tooLarge) return;
    if (echo) {
      res.setHeader("X-Received-Bytes", String(received));
      res.end();
      return;
    }
    res.json({ received, receivedBytes: received });
  });

  req.on("error", () => {
    if (!res.headersSent && !tooLarge) res.status(400).end();
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

function start(port = PORT, host = HOST) {
  return app.listen(port, host, () => {
    console.log(
      `tp5-qos-backend v${VERSION} listening on http://${host}:${port}`,
    );
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start, parseBytesParam, MAX_BYTES };
