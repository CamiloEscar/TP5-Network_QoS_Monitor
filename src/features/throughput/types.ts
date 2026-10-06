export type ThroughputDirection = "down" | "up";

export interface ThroughputSample {
  direction: ThroughputDirection;
  /** Bytes reales transferidos (conteo cliente), nunca el tamaño nominal pedido. */
  bytes: number;
  /** Wall-clock client-side: request start → body consumido (down) / response completa (up). */
  ms: number;
  mbps: number;
}

/**
 * Resultado por dirección.
 *
 * `mbps` es el agregado PONDERADO POR TAMAÑO: `totalBytes * 8 / totalMs / 1e6`
 * sobre las muestras kept (NO el promedio aritmético de los `mbps` por muestra:
 * un payload grande mide el enlace con más precisión que uno chico).
 */
export interface ThroughputDirectionResult {
  samples: ThroughputSample[];
  mbps: number;
  totalBytes: number;
  totalMs: number;
  /**
   * "Corrección por tamaño de payload": el payload más grande es la medición
   * autoritativa y los chicos son diagnóstico. Esta muestra es la que la UI
   * debe mostrar como headline junto al agregado `mbps`.
   */
  authoritative: ThroughputSample | null;
}

/** Desajuste entre el conteo cliente (preferido) y el reportado por el backend. */
export interface ThroughputByteMismatch {
  direction: ThroughputDirection;
  /** Tamaño pedido (nominal). */
  nominalBytes: number;
  /** Conteo cliente: el que se usa en `sample.bytes`. */
  countedBytes: number;
  /** Conteo del backend: `Content-Length` en down, `received`/`receivedBytes` en up. */
  reportedBytes: number;
}

export interface ThroughputFailure {
  direction: ThroughputDirection;
  nominalBytes: number;
  message: string;
}

export interface ThroughputResult {
  down: ThroughputDirectionResult;
  up: ThroughputDirectionResult;
  baseUrl: string;
  /** Desajustes byte-count (se prefiere el conteo cliente y se surfacea el conflicto). */
  mismatches: ThroughputByteMismatch[];
  /**
   * Tamaños que fallaron sin abortar el run. Política: si falla la primera
   * muestra kept el run falla (ThroughputError); las posteriores se registran
   * acá y se continúa. El warm-up throwaway nunca aparece acá ni en `samples`.
   */
  failures: ThroughputFailure[];
}

export interface ThroughputOptions {
  baseUrl: string;
  /** Bytes por pasada de descarga (settings default 1/5/10 MiB). */
  downloadSizes: number[];
  /** Bytes por pasada de subida (settings default 1/2/5 MiB). */
  uploadSizes: number[];
  /** Si es true, una pasada throwaway por dirección (más chico) se descarta. */
  warmup: boolean;
  signal?: AbortSignal;
  onProgress?: (p: {
    phase: ThroughputDirection;
    index: number;
    total: number;
  }) => void;
}
