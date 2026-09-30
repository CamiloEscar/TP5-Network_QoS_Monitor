"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, MAX_BYTES } = require("./server.js");

let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("GET /health returns ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.ok, true);
  assert.equal(typeof body.uptime, "number");
  assert.equal(typeof body.version, "string");
});

test("GET /ping returns ts", async () => {
  const res = await fetch(`${base}/ping`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.ts, "number");
});

test("GET /download/1024 returns exactly 1024 bytes", async () => {
  const res = await fetch(`${base}/download/1024`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/octet-stream");
  assert.equal(res.headers.get("content-length"), "1024");
  const buf = await res.arrayBuffer();
  assert.equal(buf.byteLength, 1024);
});

test("POST /upload echoes the byte count", async () => {
  const payload = Buffer.alloc(5000, 7);
  const res = await fetch(`${base}/upload`, { method: "POST", body: payload });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.received, 5000);
  assert.equal(body.receivedBytes, 5000);
});

test("GET /download/:bytes returns 400 for invalid values", async () => {
  for (const bad of ["abc", "0", "-5", "10.5", "1e6", `${MAX_BYTES + 1}`]) {
    const res = await fetch(`${base}/download/${bad}`);
    assert.equal(res.status, 400, `expected 400 for "${bad}"`);
  }
});
