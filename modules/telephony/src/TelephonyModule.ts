import { NativeModule, requireNativeModule } from "expo";

import type {
  ProbeTcpConnectResult,
  TelephonyChangeEventPayload,
  TelephonyInfo,
} from "./Telephony.types";

declare class TelephonyModule extends NativeModule<{
  onTelephonyChange: (payload: TelephonyChangeEventPayload) => void;
}> {
  getTelephonyInfo(): Promise<TelephonyInfo>;
  probeTcpConnect(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<ProbeTcpConnectResult>;
}

export default requireNativeModule<TelephonyModule>("Telephony");
