import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateHost } from "./aggregate.ts";

test("aggregateHost computes min/max/avg/loss and RFC3550 jitter", () => {
  const stats = aggregateHost(
    { host: "example.com", port: 443 },
    [100, 102, 98, 105],
  );
  assert.equal(stats.minMs, 98);
  assert.equal(stats.maxMs, 105);
  assert.equal(stats.avgMs, 101.25);
  assert.equal(stats.loss, 0);
  assert.deepEqual(stats.rttsMs, [100, 102, 98, 105]);
  // Hand-replicated RFC3550 recurrence: J(0)=0, J(i)=J(i-1)+(|d|-J(i-1))/16
  // J(1)=0.125, J(2)=0.3671875, J(3)=0.78173828125
  assert.ok(Math.abs(stats.jitterMs - 0.78173828125) < 1e-9);
});

test("aggregateHost: all losses -> loss=1, jitterMs=0, minMs=0", () => {
  const stats = aggregateHost({ host: "example.com", port: 443 }, [
    null,
    null,
    null,
  ]);
  assert.equal(stats.loss, 1);
  assert.equal(stats.jitterMs, 0);
  assert.equal(stats.minMs, 0);
  assert.equal(stats.maxMs, 0);
  assert.equal(stats.avgMs, 0);
  assert.deepEqual(stats.rttsMs, []);
});
