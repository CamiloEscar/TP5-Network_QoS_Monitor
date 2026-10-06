export type CancellationToken = { readonly cancelled: boolean; cancel(): void };

export type ProbeHost = { host: string; port: number };

export type ProbeConfig = {
  hosts: ProbeHost[];
  count: number;
  timeoutMs: number;
  interProbeDelayMs?: number;
};

export type HostStats = {
  host: string;
  port: number;
  minMs: number;
  avgMs: number;
  maxMs: number;
  jitterMs: number;
  loss: number;
  rttsMs: number[];
};

export type ProbeRunResult = {
  ts: number;
  perHost: HostStats[];
};

export interface TcpProber {
  connect(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<number | null>; // null = loss
}

export type ProbeProgress = {
  host: string;
  probeIndex: number;
  rttMs: number | null;
};

export function createCancellationToken(): CancellationToken {
  let cancelled = false;
  return {
    get cancelled() {
      return cancelled;
    },
    cancel() {
      cancelled = true;
    },
  };
}
