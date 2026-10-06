export type TelephonyInfo = {
  carrier: string | null;
  networkType: string; // fine-grained, e.g. 'LTE', 'NR', 'UMTS', 'unknown'
  generation: "2g" | "3g" | "4g" | "5g" | null;
  rssiDbm: number | null;
  signalLevel: number | null; // 0-4 (Android ASU-derived level) or null
};

export type TelephonyChangeEventPayload = { info: TelephonyInfo };

export type ProbeTcpConnectResult = {
  rttMs: number | null;
  error: string | null;
};
