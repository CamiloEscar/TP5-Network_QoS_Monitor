import type {
  CellularGeneration,
  NetworkType,
} from "@/features/network/use-network";

import { getDb } from "./db";
import type { HistoryFilter, MeasurementRecord } from "./types";

type MeasurementRow = {
  id: string;
  session_id: string;
  ts: number;
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  network_type: string;
  cellular_generation: string | null;
  carrier: string | null;
  rssi_dbm: number | null;
  signal_level: number | null;
  ping_min_ms: number | null;
  ping_avg_ms: number | null;
  ping_max_ms: number | null;
  ping_jitter_ms: number | null;
  ping_loss: number | null;
  ping_hosts: string | null;
  throughput_down_mbps: number | null;
  throughput_up_mbps: number | null;
  payload_bytes: number | null;
  backend_url: string | null;
};

function toRecord(row: MeasurementRow): MeasurementRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    ts: row.ts,
    lat: row.lat,
    lon: row.lon,
    accuracy: row.accuracy,
    networkType: row.network_type as NetworkType,
    cellularGeneration: (row.cellular_generation ??
      null) as CellularGeneration | null,
    carrier: row.carrier,
    rssiDbm: row.rssi_dbm,
    signalLevel: row.signal_level,
    ping:
      row.ping_avg_ms == null
        ? null
        : {
            minMs: row.ping_min_ms ?? 0,
            avgMs: row.ping_avg_ms,
            maxMs: row.ping_max_ms ?? 0,
            jitterMs: row.ping_jitter_ms ?? 0,
            loss: row.ping_loss ?? 0,
            hosts: row.ping_hosts ? JSON.parse(row.ping_hosts) : [],
          },
    throughput:
      row.throughput_down_mbps == null &&
      row.throughput_up_mbps == null &&
      row.backend_url == null
        ? null
        : {
            downMbps: row.throughput_down_mbps,
            upMbps: row.throughput_up_mbps,
            payloadBytes: row.payload_bytes,
            backendUrl: row.backend_url,
          },
  };
}

export async function insertMeasurement(m: MeasurementRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO measurements (
      id, session_id, ts, lat, lon, accuracy,
      network_type, cellular_generation, carrier, rssi_dbm, signal_level,
      ping_min_ms, ping_avg_ms, ping_max_ms, ping_jitter_ms, ping_loss, ping_hosts,
      throughput_down_mbps, throughput_up_mbps, payload_bytes, backend_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    m.id,
    m.sessionId,
    m.ts,
    m.lat,
    m.lon,
    m.accuracy,
    m.networkType,
    m.cellularGeneration,
    m.carrier,
    m.rssiDbm,
    m.signalLevel,
    m.ping?.minMs ?? null,
    m.ping?.avgMs ?? null,
    m.ping?.maxMs ?? null,
    m.ping?.jitterMs ?? null,
    m.ping?.loss ?? null,
    m.ping ? JSON.stringify(m.ping.hosts) : null,
    m.throughput?.downMbps ?? null,
    m.throughput?.upMbps ?? null,
    m.throughput?.payloadBytes ?? null,
    m.throughput?.backendUrl ?? null,
  );
}

export async function queryMeasurements(
  f: HistoryFilter = {},
): Promise<MeasurementRecord[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (f.networkTypes?.length) {
    where.push(`network_type IN (${f.networkTypes.map(() => "?").join(", ")})`);
    params.push(...f.networkTypes);
  }
  if (f.fromTs != null) {
    where.push("ts >= ?");
    params.push(f.fromTs);
  }
  if (f.toTs != null) {
    where.push("ts <= ?");
    params.push(f.toTs);
  }
  if (f.bbox) {
    where.push(
      "lat IS NOT NULL AND lon IS NOT NULL AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
    );
    params.push(f.bbox.minLat, f.bbox.maxLat, f.bbox.minLon, f.bbox.maxLon);
  }
  if (f.sessionId) {
    where.push("session_id = ?");
    params.push(f.sessionId);
  }

  const sql = `SELECT * FROM measurements${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ts ASC`;
  const rows = await db.getAllAsync<MeasurementRow>(sql, params);
  return rows.map(toRecord);
}
