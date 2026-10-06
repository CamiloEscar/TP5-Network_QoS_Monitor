import type { CancellationToken } from "@/features/probes";
import { runRttProbes, socketProber } from "@/features/probes";
import { getFix } from "@/features/geo/location";
import { insertMeasurement } from "@/features/storage/measurements";
import type { Settings } from "@/features/storage/settings";
import {
  newId,
  type HostStats,
  type MeasurementPing,
  type MeasurementRecord,
  type MeasurementThroughput,
} from "@/features/storage/types";
import type { NetworkSnapshot } from "@/features/network/use-network";
import { runThroughputTest } from "@/features/throughput";

export type RunMeasurementOptions = {
  throughput?: boolean;
  quick?: boolean;
  sessionId: string;
};

type Progress = {
  stage: "rtt" | "throughput" | "persisting";
  host?: string;
  done?: number;
  total?: number;
};

function abortError(): Error {
  const e = new Error("Measurement cancelled");
  e.name = "AbortError";
  return e;
}

function aggregatePing(perHost: HostStats[]): MeasurementPing {
  const live = perHost.filter((h) => h.loss !== 1);
  if (live.length === 0) {
    return {
      minMs: 0,
      avgMs: 0,
      maxMs: 0,
      jitterMs: 0,
      loss: mean(perHost.map((h) => h.loss)),
      hosts: perHost,
    };
  }
  const totalCount = (h: HostStats) => h.rttsMs.length * (1 - h.loss);
  const weightTotal = live.reduce((sum, h) => sum + totalCount(h), 0);
  const avgMs =
    weightTotal > 0
      ? live.reduce((sum, h) => sum + h.avgMs * totalCount(h), 0) / weightTotal
      : mean(live.map((h) => h.avgMs));
  return {
    minMs: Math.min(...live.map((h) => h.minMs)),
    avgMs,
    maxMs: Math.max(...live.map((h) => h.maxMs)),
    jitterMs: mean(perHost.map((h) => h.jitterMs)),
    loss: mean(perHost.map((h) => h.loss)),
    hosts: perHost,
  };
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export async function runMeasurement(
  opts: RunMeasurementOptions,
  token: CancellationToken,
  deps: {
    network: NetworkSnapshot;
    settings: Settings;
    onProgress?: (p: Progress) => void;
  },
): Promise<MeasurementRecord> {
  const { settings } = deps;

  if (token.cancelled) throw abortError();

  const rttResult = await runRttProbes(
    {
      hosts: settings.probe.hosts,
      count: opts.quick
        ? Math.min(3, settings.probe.count)
        : settings.probe.count,
      timeoutMs: settings.probe.timeoutMs,
      interProbeDelayMs: settings.probe.interProbeDelayMs,
    },
    token,
    socketProber,
    (p) => deps.onProgress?.({ stage: "rtt", host: p.host }),
  );
  const ping = aggregatePing(rttResult.perHost);

  if (token.cancelled) throw abortError();

  let throughput: MeasurementThroughput | null = null;
  const wantsThroughput = opts.throughput !== false && !opts.quick;
  if (wantsThroughput) {
    try {
      const result = await runThroughputTest({
        baseUrl: settings.throughput.baseUrl,
        downloadSizes: settings.throughput.schedule.downBytes,
        uploadSizes: settings.throughput.schedule.upBytes,
        warmup: settings.throughput.warmup,
        onProgress: (p) =>
          deps.onProgress?.({
            stage: "throughput",
            host: p.phase,
            done: p.index,
            total: p.total,
          }),
      });
      throughput = {
        downMbps: result.down.mbps || null,
        upMbps: result.up.mbps || null,
        payloadBytes: result.down.totalBytes + result.up.totalBytes,
        backendUrl: result.baseUrl,
      };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      // backend caído -> degradación explícita: continuamos sin throughput en vez de romper la sesión
      throughput = null;
    }
  }

  if (token.cancelled) throw abortError();

  const fix = await getFix();

  const record: MeasurementRecord = {
    id: newId(),
    sessionId: opts.sessionId,
    ts: Date.now(),
    lat: fix?.lat ?? null,
    lon: fix?.lon ?? null,
    accuracy: fix?.accuracy ?? null,
    networkType: deps.network.type,
    cellularGeneration: deps.network.cellularGeneration ?? null,
    carrier: deps.network.carrier ?? null, // Batch 3: telephony module poblará rssi/carrier reales
    rssiDbm: null, // Batch 3: pendiente de modules/telephony
    signalLevel: null, // Batch 3: pendiente de modules/telephony
    ping,
    throughput,
  };

  deps.onProgress?.({ stage: "persisting" });
  await insertMeasurement(record);

  return record;
}
