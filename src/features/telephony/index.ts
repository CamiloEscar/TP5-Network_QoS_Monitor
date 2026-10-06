import TelephonyModule, {
  addOnTelephonyChangeListener,
  type TelephonyInfo,
} from "../../../modules/telephony/src";

export type { TelephonyInfo };

const FALLBACK: TelephonyInfo = {
  carrier: null,
  networkType: "unknown",
  generation: null,
  rssiDbm: null,
  signalLevel: null,
};

export async function getTelephonyInfo(): Promise<TelephonyInfo> {
  try {
    return await TelephonyModule.getTelephonyInfo();
  } catch {
    return FALLBACK; // no permission, module not linked, or platform unsupported — degrade, never throw
  }
}

export { addOnTelephonyChangeListener };

export async function probeTcpConnect(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<number | null> {
  try {
    const r = await TelephonyModule.probeTcpConnect(host, port, timeoutMs);
    return r.rttMs;
  } catch {
    return null;
  }
}
