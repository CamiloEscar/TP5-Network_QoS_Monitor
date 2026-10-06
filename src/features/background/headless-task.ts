import BackgroundFetch from "react-native-background-fetch";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "expo-sqlite/kv-store";

import { maybeNotifyDegradation } from "@/features/background/notifications";
import { getFix } from "@/features/geo/location";
import { toSnapshot } from "@/features/network/use-network";
import {
  createCancellationToken,
  runRttProbes,
  socketProber,
} from "@/features/probes";
import type { HostStats } from "@/features/probes";
import { startSession } from "@/features/session/session";
import { getSettings } from "@/features/storage/settings";
import { insertMeasurement } from "@/features/storage/measurements";
import {
  newId,
  type MeasurementPing,
  type MeasurementRecord,
} from "@/features/storage/types";
import { getTelephonyInfo } from "@/features/telephony";

export const HEADLESS_TASK_ID = "qos-monitor-background-sample";

const TODAY_SESSION_ID_KEY = "background.todaySessionId";
const TODAY_SESSION_DATE_KEY = "background.todaySessionDate";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Same aggregation formula as src/features/session/run-measurement.ts (aggregatePing) —
// kept in sync manually since that function isn't exported.
function aggregatePing(perHost: HostStats[]): MeasurementPing {
  const mean = (xs: number[]) =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
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

async function getOrCreateTodaySessionId(): Promise<string> {
  const today = todayKey();
  const [storedId, storedDate] = await Promise.all([
    AsyncStorage.getItem(TODAY_SESSION_ID_KEY),
    AsyncStorage.getItem(TODAY_SESSION_DATE_KEY),
  ]);
  if (storedId && storedDate === today) return storedId;

  const id = await startSession(`background ${today}`);
  await AsyncStorage.setItem(TODAY_SESSION_ID_KEY, id);
  await AsyncStorage.setItem(TODAY_SESSION_DATE_KEY, today);
  return id;
}

export async function runBackgroundSample(): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.background.enabled) return;

    const netInfoState = await NetInfo.fetch();
    const networkSnapshot = toSnapshot(netInfoState);
    const telephony = await getTelephonyInfo();
    // Same merge policy as useNetwork(): NetInfo's carrier/generation preferred, telephony fills the rest.
    const merged = {
      ...networkSnapshot,
      rssiDbm: telephony.rssiDbm ?? null,
      signalLevel: telephony.signalLevel ?? null,
      carrier: networkSnapshot.carrier ?? telephony.carrier ?? null,
      cellularGeneration:
        networkSnapshot.cellularGeneration ?? telephony.generation ?? null,
    };

    const rttResult = await runRttProbes(
      {
        hosts: settings.probe.hosts,
        count: Math.min(3, settings.probe.count),
        timeoutMs: settings.probe.timeoutMs,
        interProbeDelayMs: settings.probe.interProbeDelayMs,
      },
      createCancellationToken(),
      socketProber,
    );
    const ping = aggregatePing(rttResult.perHost);

    const fix = await getFix({ allowStale: true });
    const sessionId = await getOrCreateTodaySessionId();

    const record: MeasurementRecord = {
      id: newId(),
      sessionId,
      ts: Date.now(),
      lat: fix?.lat ?? null,
      lon: fix?.lon ?? null,
      accuracy: fix?.accuracy ?? null,
      networkType: merged.type,
      cellularGeneration: merged.cellularGeneration ?? null,
      carrier: merged.carrier ?? null,
      rssiDbm: merged.rssiDbm ?? null,
      signalLevel: merged.signalLevel ?? null,
      ping,
      throughput: null,
    };

    await insertMeasurement(record);

    await maybeNotifyDegradation(
      {
        pingAvgMs: record.ping?.avgMs ?? null,
        // loss is a fraction (0..1) in storage; thresholds.lossPct is a percentage — convert.
        lossPct: record.ping ? record.ping.loss * 100 : null,
        throughputDownMbps: null,
      },
      settings.thresholds,
    );
  } catch (e) {
    console.error("runBackgroundSample failed", e);
  }
}

export function registerHeadlessTask(): void {
  BackgroundFetch.registerHeadlessTask(async (event) => {
    await runBackgroundSample();
    BackgroundFetch.finish(event.taskId);
  });
}

export function configureForegroundBackgroundFetch(): void {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    },
    async (taskId: string) => {
      await runBackgroundSample();
      BackgroundFetch.finish(taskId);
    },
    (taskId: string) => {
      BackgroundFetch.finish(taskId);
    },
  );
}
