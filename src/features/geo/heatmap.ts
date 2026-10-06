import type { MeasurementRecord } from "@/features/storage/types";

export type HeatPoint = { latitude: number; longitude: number; weight: number };

export function qualityWeight(record: MeasurementRecord): number {
  if (record.networkType === "wifi") return 0.6;

  if (record.networkType === "cellular") {
    switch (record.cellularGeneration) {
      case "5g":
        return 1.0;
      case "4g":
        return 0.75;
      case "3g":
        return 0.45;
      case "2g":
        return 0.2;
      default:
        return 0.3;
    }
  }

  return 0.5;
}

export function toHeatPoints(
  records: MeasurementRecord[],
  maxAccuracyM: number,
): HeatPoint[] {
  return records
    .filter(
      (record) =>
        record.lat != null &&
        record.lon != null &&
        record.accuracy != null &&
        record.accuracy <= maxAccuracyM,
    )
    .map((record) => ({
      latitude: record.lat!,
      longitude: record.lon!,
      weight: qualityWeight(record),
    }));
}
