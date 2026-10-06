import { registerWebModule, NativeModule } from "expo";

import type { ProbeTcpConnectResult, TelephonyInfo } from "./Telephony.types";

// TelephonyModule is not available on the web platform: no carrier/RSSI concept.
class TelephonyModule extends NativeModule<{}> {
  async getTelephonyInfo(): Promise<TelephonyInfo> {
    return {
      carrier: null,
      networkType: "unknown",
      generation: null,
      rssiDbm: null,
      signalLevel: null,
    };
  }

  async probeTcpConnect(
    _host: string,
    _port: number,
    _timeoutMs: number,
  ): Promise<ProbeTcpConnectResult> {
    return { rttMs: null, error: "not implemented on web" };
  }
}

export default registerWebModule(TelephonyModule, "Telephony");
