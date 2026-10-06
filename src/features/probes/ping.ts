import { aggregateHost } from "./aggregate.ts";
import type {
  CancellationToken,
  ProbeConfig,
  ProbeProgress,
  ProbeRunResult,
  TcpProber,
} from "./types.ts";

function abortError(): Error {
  const e = new Error("Probe run aborted");
  e.name = "AbortError";
  return e;
}

function delay(ms: number): Promise<void> {
  // setTimeout-based: yields the event loop, never blocks the JS thread.
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRttProbes(
  cfg: ProbeConfig,
  token: CancellationToken,
  prober: TcpProber,
  onProgress?: (p: ProbeProgress) => void,
): Promise<ProbeRunResult> {
  const perHost = [];
  for (const host of cfg.hosts) {
    const samples: (number | null)[] = [];
    for (let i = 0; i < cfg.count; i++) {
      if (token.cancelled) throw abortError();
      const rttMs = await prober.connect(host.host, host.port, cfg.timeoutMs);
      samples.push(rttMs);
      onProgress?.({ host: host.host, probeIndex: i, rttMs });
      if (i < cfg.count - 1) {
        await delay(cfg.interProbeDelayMs ?? 200);
      }
    }
    perHost.push(aggregateHost(host, samples));
  }
  return { ts: Date.now(), perHost };
}
