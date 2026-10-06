import notifee, { AndroidImportance } from "@notifee/react-native";
import AsyncStorage from "expo-sqlite/kv-store";

import type { Thresholds } from "@/features/storage/settings";

const CHANNEL_ID = "degradacion";
const LAST_NOTIFIED_KEY = "background.lastNotifiedAt";
const RATE_LIMIT_MS = 30 * 60 * 1000;

export async function ensureNotificationChannel(): Promise<void> {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Degradación de red",
    importance: AndroidImportance.HIGH,
  });
}

export type DegradationCheck = {
  pingAvgMs: number | null;
  lossPct: number | null;
  throughputDownMbps: number | null;
};

export function evaluateDegradation(
  check: DegradationCheck,
  thresholds: Thresholds,
): boolean {
  return (
    (check.pingAvgMs != null && check.pingAvgMs > thresholds.pingAvgMs) ||
    (check.lossPct != null && check.lossPct > thresholds.lossPct) ||
    (check.throughputDownMbps != null &&
      check.throughputDownMbps < thresholds.throughputDownMbps)
  );
}

export async function maybeNotifyDegradation(
  check: DegradationCheck,
  thresholds: Thresholds,
): Promise<void> {
  if (!evaluateDegradation(check, thresholds)) return;

  const lastRaw = await AsyncStorage.getItem(LAST_NOTIFIED_KEY);
  const lastNotifiedAt = lastRaw ? Number(lastRaw) : 0;
  if (Date.now() - lastNotifiedAt < RATE_LIMIT_MS) return;

  const reasons: string[] = [];
  if (check.pingAvgMs != null && check.pingAvgMs > thresholds.pingAvgMs) {
    reasons.push("Latencia promedio alta");
  }
  if (check.lossPct != null && check.lossPct > thresholds.lossPct) {
    reasons.push("Pérdida de paquetes elevada");
  }
  if (
    check.throughputDownMbps != null &&
    check.throughputDownMbps < thresholds.throughputDownMbps
  ) {
    reasons.push("Throughput de descarga bajo");
  }

  await notifee.displayNotification({
    title: "Degradación de red detectada",
    body: reasons.join(" / "),
    android: { channelId: CHANNEL_ID, importance: AndroidImportance.HIGH },
  });
  await AsyncStorage.setItem(LAST_NOTIFIED_KEY, String(Date.now()));
}
