import type { HostStats, ProbeHost } from "./types.ts";

export function aggregateHost(
  host: ProbeHost,
  rttsMs: (number | null)[],
): HostStats {
  const successes = rttsMs.filter((r): r is number => r !== null);
  const total = rttsMs.length;
  if (successes.length === 0) {
    return {
      host: host.host,
      port: host.port,
      minMs: 0,
      avgMs: 0,
      maxMs: 0,
      jitterMs: 0,
      loss: 1,
      rttsMs: [],
    };
  }
  const minMs = Math.min(...successes);
  const maxMs = Math.max(...successes);
  const avgMs = successes.reduce((a, b) => a + b, 0) / successes.length;
  const loss = (total - successes.length) / total;

  // RFC 3550 running jitter estimate over successful RTTs in arrival order.
  let jitterMs = 0;
  for (let i = 1; i < successes.length; i++) {
    jitterMs += (Math.abs(successes[i] - successes[i - 1]) - jitterMs) / 16;
  }

  return {
    host: host.host,
    port: host.port,
    minMs,
    avgMs,
    maxMs,
    jitterMs,
    loss,
    rttsMs: successes,
  };
}
