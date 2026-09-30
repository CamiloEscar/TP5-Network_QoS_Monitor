import AsyncStorage from "expo-sqlite/kv-store";

export type ProbeHost = { host: string; port: number };

export type Thresholds = {
  pingAvgMs: number;
  lossPct: number;
  throughputDownMbps: number;
};

export type Settings = {
  probe: {
    hosts: ProbeHost[];
    count: number;
    timeoutMs: number;
    interProbeDelayMs: number;
  };
  throughput: {
    baseUrl: string;
    schedule: { downBytes: number[]; upBytes: number[] };
    warmup: boolean;
  };
  thresholds: Thresholds;
  geo: { maxAccuracyM: number };
  background: { enabled: boolean; intervalMin: number };
};

export type SettingsPatch = {
  probe?: Partial<Settings["probe"]>;
  throughput?: Partial<Settings["throughput"]>;
  thresholds?: Partial<Settings["thresholds"]>;
  geo?: Partial<Settings["geo"]>;
  background?: Partial<Settings["background"]>;
};

const MIB = 1024 * 1024;
const SETTINGS_KEY = "settings";

export const DEFAULT_SETTINGS: Settings = {
  probe: {
    hosts: [
      { host: "1.1.1.1", port: 443 },
      { host: "8.8.8.8", port: 53 },
      { host: "208.67.222.222", port: 53 },
    ],
    count: 10,
    timeoutMs: 3000,
    interProbeDelayMs: 200,
  },
  throughput: {
    baseUrl: "http://10.0.2.2:8080",
    schedule: {
      downBytes: [1 * MIB, 5 * MIB, 10 * MIB],
      upBytes: [1 * MIB, 2 * MIB, 5 * MIB],
    },
    warmup: true,
  },
  thresholds: { pingAvgMs: 300, lossPct: 20, throughputDownMbps: 1 },
  geo: { maxAccuracyM: 50 },
  background: { enabled: false, intervalMin: 15 },
};

function mergeStored(
  base: Settings,
  stored: Partial<Settings> | null,
): Settings {
  if (!stored) return base;
  return {
    probe: { ...base.probe, ...stored.probe },
    throughput: { ...base.throughput, ...stored.throughput },
    thresholds: { ...base.thresholds, ...stored.thresholds },
    geo: { ...base.geo, ...stored.geo },
    background: { ...base.background, ...stored.background },
  };
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return mergeStored(DEFAULT_SETTINGS, raw ? JSON.parse(raw) : null);
}

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  const next = mergeStored(await getSettings(), patch as Partial<Settings>);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
