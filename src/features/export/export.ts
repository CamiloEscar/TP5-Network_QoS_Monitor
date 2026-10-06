import { Share } from "react-native";

import type { MeasurementRecord } from "@/features/storage/types";

const CSV_COLUMNS: Array<
  [string, (r: MeasurementRecord) => string | number | null]
> = [
  ["id", (r) => r.id],
  ["sessionId", (r) => r.sessionId],
  ["ts", (r) => r.ts],
  ["lat", (r) => r.lat],
  ["lon", (r) => r.lon],
  ["accuracy", (r) => r.accuracy],
  ["networkType", (r) => r.networkType],
  ["cellularGeneration", (r) => r.cellularGeneration],
  ["carrier", (r) => r.carrier],
  ["rssiDbm", (r) => r.rssiDbm],
  ["signalLevel", (r) => r.signalLevel],
  ["ping_minMs", (r) => r.ping?.minMs ?? null],
  ["ping_avgMs", (r) => r.ping?.avgMs ?? null],
  ["ping_maxMs", (r) => r.ping?.maxMs ?? null],
  ["ping_jitterMs", (r) => r.ping?.jitterMs ?? null],
  ["ping_loss", (r) => r.ping?.loss ?? null],
  ["throughput_downMbps", (r) => r.throughput?.downMbps ?? null],
  ["throughput_upMbps", (r) => r.throughput?.upMbps ?? null],
];

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const s = String(value);
  return s.includes(",") ? `"${s}"` : s;
}

export function toCsv(records: MeasurementRecord[]): string {
  const header = CSV_COLUMNS.map(([name]) => name).join(",");
  const rows = records.map((r) =>
    CSV_COLUMNS.map(([, get]) => csvCell(get(r))).join(","),
  );
  return [header, ...rows].join("\n");
}

export function toJson(records: MeasurementRecord[]): string {
  return JSON.stringify(records, null, 2);
}

export async function exportHistory(
  records: MeasurementRecord[],
  format: "csv" | "json",
): Promise<boolean> {
  if (records.length === 0) return false;
  const content = format === "csv" ? toCsv(records) : toJson(records);
  await Share.share({ message: content, title: `qos-export.${format}` });
  return true;
}
