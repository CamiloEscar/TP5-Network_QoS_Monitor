import type {
  CellularGeneration,
  NetworkType,
} from "@/features/network/use-network";

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

export type MeasurementPing = {
  minMs: number;
  avgMs: number;
  maxMs: number;
  jitterMs: number;
  loss: number;
  hosts: HostStats[];
};

export type MeasurementThroughput = {
  downMbps: number | null;
  upMbps: number | null;
  payloadBytes: number | null;
  backendUrl: string | null;
};

export type MeasurementRecord = {
  id: string;
  sessionId: string;
  ts: number;
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  networkType: NetworkType;
  cellularGeneration: CellularGeneration | null;
  carrier: string | null;
  rssiDbm: number | null;
  signalLevel: number | null;
  ping: MeasurementPing | null;
  throughput: MeasurementThroughput | null;
};

export type Session = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  label: string | null;
};

export type SessionSummary = Session & {
  measurementCount: number;
};

export type GeoBbox = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type HistoryFilter = {
  networkTypes?: NetworkType[];
  fromTs?: number;
  toTs?: number;
  bbox?: GeoBbox;
  sessionId?: string;
};

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
