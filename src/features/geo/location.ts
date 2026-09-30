import * as Location from "expo-location";

export type GeoFix = {
  lat: number;
  lon: number;
  accuracy: number;
  ts: number;
};

export const DEFAULT_MAX_ACCURACY_M = 50;

const FIX_TIMEOUT_MS = 10_000;
const STALE_MAX_AGE_MS = 5 * 60_000;

export async function ensureForegroundPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  const request = await Location.requestForegroundPermissionsAsync();
  return request.granted;
}

export async function ensureBackgroundPermission(): Promise<boolean> {
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) return true;
  const request = await Location.requestBackgroundPermissionsAsync();
  return request.granted;
}

function toFix(pos: Location.LocationObject): GeoFix {
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 0,
    ts: pos.timestamp,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getFix(opts?: {
  allowStale?: boolean;
}): Promise<GeoFix | null> {
  try {
    if (opts?.allowStale) {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: STALE_MAX_AGE_MS,
      });
      if (last) return toFix(last);
    }
    const pos = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      FIX_TIMEOUT_MS,
    );
    return pos ? toFix(pos) : null;
  } catch {
    return null;
  }
}

export function isAccurateEnough(
  fix: GeoFix | null,
  maxAccuracyM: number = DEFAULT_MAX_ACCURACY_M,
): boolean {
  return fix != null && fix.accuracy <= maxAccuracyM;
}
