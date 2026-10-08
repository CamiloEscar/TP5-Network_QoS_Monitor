import type {
  ThroughputByteMismatch,
  ThroughputDirection,
  ThroughputDirectionResult,
  ThroughputFailure,
  ThroughputOptions,
  ThroughputResult,
  ThroughputSample,
} from "./types.ts";

export * from "./types.ts";

export function computeMbps(bytes: number, ms: number): number {
  if (
    !Number.isFinite(bytes) ||
    !Number.isFinite(ms) ||
    bytes <= 0 ||
    ms <= 0
  ) {
    return 0;
  }
  return (bytes * 8) / (ms / 1000) / 1e6;
}

export function aggregateSamples(
  samples: ThroughputSample[],
): ThroughputDirectionResult {
  let totalBytes = 0;
  let totalMs = 0;
  let authoritative: ThroughputSample | null = null;
  for (const s of samples) {
    totalBytes += s.bytes;
    totalMs += s.ms;
    if (authoritative === null || s.bytes > authoritative.bytes) {
      authoritative = s;
    }
  }
  return {
    samples,
    mbps: computeMbps(totalBytes, totalMs),
    totalBytes,
    totalMs,
    authoritative,
  };
}

type RunCtx = {
  base: string;
  signal: AbortSignal;
  mismatches: ThroughputByteMismatch[];
};

function abortError(): Error {
  const e = new Error("Throughput test aborted");
  e.name = "AbortError";
  return e;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function isAbort(e: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (e instanceof Error && e.name === "AbortError");
}

function wrapFetchError(e: unknown, signal: AbortSignal, what: string): Error {
  if (isAbort(e, signal)) return abortError();
  const msg = e instanceof Error ? e.message : String(e);
  return new Error(`${what}: backend unreachable (${msg})`);
}

function randomBytes(n: number): Uint8Array {
  // Hermes no expone Web Crypto global; el payload es solo relleno para medir
  // throughput de subida, no necesita ser criptográficamente seguro.
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (Math.random() * 256) | 0;
  }
  return out;
}

async function consumeBody(
  res: Response,
  signal: AbortSignal,
): Promise<number> {
  if (!res.body) {
    return (await res.arrayBuffer()).byteLength;
  }
  const reader = res.body.getReader();
  let counted = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    counted += value?.byteLength ?? 0;
    if (signal.aborted) {
      await reader.cancel().catch(() => undefined);
      throw abortError();
    }
  }
  return counted;
}

async function downloadOnce(
  ctx: RunCtx,
  nominal: number,
): Promise<ThroughputSample> {
  throwIfAborted(ctx.signal);
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(`${ctx.base}/download/${nominal}`, {
      signal: ctx.signal,
    });
  } catch (e) {
    throw wrapFetchError(e, ctx.signal, `download ${nominal} B`);
  }
  if (!res.ok) throw new Error(`download ${nominal} B: HTTP ${res.status}`);
  const counted = await consumeBody(res, ctx.signal);
  const ms = performance.now() - t0;
  throwIfAborted(ctx.signal);
  const raw = res.headers.get("content-length");
  const declared = raw === null ? NaN : Number(raw);
  if (Number.isFinite(declared) && declared !== counted) {
    ctx.mismatches.push({
      direction: "down",
      nominalBytes: nominal,
      countedBytes: counted,
      reportedBytes: declared,
    });
  }
  return {
    direction: "down",
    bytes: counted,
    ms,
    mbps: computeMbps(counted, ms),
  };
}

async function uploadOnce(
  ctx: RunCtx,
  nominal: number,
): Promise<ThroughputSample> {
  throwIfAborted(ctx.signal);
  const body = randomBytes(nominal);
  const sent = body.byteLength;
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(`${ctx.base}/upload`, {
      method: "POST",
      // ArrayBuffer view keeps byte count identical to `sent`; fetch rejects Uint8Array directly.
      body: body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength,
      ) as ArrayBuffer,
      signal: ctx.signal,
    });
  } catch (e) {
    throw wrapFetchError(e, ctx.signal, `upload ${nominal} B`);
  }
  if (!res.ok) throw new Error(`upload ${nominal} B: HTTP ${res.status}`);
  let reported: number;
  try {
    const json = (await res.json()) as {
      received?: number;
      receivedBytes?: number;
    };
    reported = Number(json.received ?? json.receivedBytes);
  } catch (e) {
    throw wrapFetchError(e, ctx.signal, `upload ${nominal} B response`);
  }
  const ms = performance.now() - t0;
  throwIfAborted(ctx.signal);
  if (Number.isFinite(reported) && reported !== sent) {
    ctx.mismatches.push({
      direction: "up",
      nominalBytes: nominal,
      countedBytes: sent,
      reportedBytes: reported,
    });
  }
  return { direction: "up", bytes: sent, ms, mbps: computeMbps(sent, ms) };
}

async function runDirection(
  ctx: RunCtx,
  direction: ThroughputDirection,
  sizes: number[],
  warmup: boolean,
  onProgress: ThroughputOptions["onProgress"],
  failures: ThroughputFailure[],
): Promise<ThroughputDirectionResult> {
  const once = direction === "down" ? downloadOnce : uploadOnce;
  if (warmup && sizes.length > 0) {
    try {
      await once(ctx, Math.min(...sizes));
    } catch (e) {
      if (isAbort(e, ctx.signal)) throw e;
    }
  }
  const samples: ThroughputSample[] = [];
  for (let i = 0; i < sizes.length; i++) {
    await new Promise((r) => setTimeout(r, 0));
    throwIfAborted(ctx.signal);
    // Let onProgress errors propagate — swallowing a UI callback error here is nonsensical.
    onProgress?.({ phase: direction, index: i, total: sizes.length });
    try {
      samples.push(await once(ctx, sizes[i]));
    } catch (e) {
      if (isAbort(e, ctx.signal)) throw e;
      if (samples.length === 0) throw e;
      failures.push({
        direction,
        nominalBytes: sizes[i],
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return aggregateSamples(samples);
}

export async function runThroughputTest(
  o: ThroughputOptions,
): Promise<ThroughputResult> {
  const base = o.baseUrl.replace(/\/+$/, "");
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  const external = o.signal;
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  const ctx: RunCtx = { base, signal: ctrl.signal, mismatches: [] };
  const failures: ThroughputFailure[] = [];
  try {
    const down = await runDirection(
      ctx,
      "down",
      o.downloadSizes,
      o.warmup,
      o.onProgress,
      failures,
    );
    const up = await runDirection(
      ctx,
      "up",
      o.uploadSizes,
      o.warmup,
      o.onProgress,
      failures,
    );
    return { down, up, baseUrl: base, mismatches: ctx.mismatches, failures };
  } finally {
    external?.removeEventListener("abort", onAbort);
  }
}
