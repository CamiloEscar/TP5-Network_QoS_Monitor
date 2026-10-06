import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

import { getTelephonyInfo } from "../telephony";

export type NetworkType =
  | "unknown"
  | "none"
  | "cellular"
  | "wifi"
  | "bluetooth"
  | "ethernet"
  | "wimax"
  | "vpn"
  | "other";

export type CellularGeneration = "2g" | "3g" | "4g" | "5g";

export type NetworkSnapshot = {
  type: NetworkType;
  isConnected: boolean;
  isInternetReachable: boolean;
  isExpensive: boolean;
  ssid?: string | null;
  ipAddress?: string | null;
  wifiStrength?: number | null;
  linkSpeed?: number | null;
  carrier?: string | null;
  cellularGeneration?: CellularGeneration | null;
  rssiDbm?: number | null;
  signalLevel?: number | null;
  fineNetworkType?: string | null;
};

type TelephonyFields = {
  rssiDbm?: number | null;
  signalLevel?: number | null;
  fineNetworkType?: string | null;
  carrier?: string | null;
  cellularGeneration?: CellularGeneration | null;
};

function toSnapshot(state: NetInfoState): NetworkSnapshot {
  const common = {
    type: state.type as NetworkType,
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    isExpensive: state.details?.isConnectionExpensive ?? false,
  };

  if (state.type === "wifi") {
    return {
      ...common,
      ssid: state.details.ssid,
      ipAddress: state.details.ipAddress,
      wifiStrength: state.details.strength ?? null,
      linkSpeed: state.details.linkSpeed ?? null,
    };
  }

  if (state.type === "cellular") {
    return {
      ...common,
      carrier: state.details.carrier,
      cellularGeneration: (state.details.cellularGeneration ??
        null) as CellularGeneration | null,
    };
  }

  return common;
}

const INITIAL: NetworkSnapshot = {
  type: "unknown",
  isConnected: false,
  isInternetReachable: false,
  isExpensive: false,
};

export function useNetwork(): NetworkSnapshot {
  const [netInfoSnapshot, setNetInfoSnapshot] =
    useState<NetworkSnapshot>(INITIAL);
  const [telephonyFields, setTelephonyFields] = useState<TelephonyFields>({});

  useEffect(
    () =>
      NetInfo.addEventListener((state) =>
        setNetInfoSnapshot(toSnapshot(state)),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const info = await getTelephonyInfo();
      if (cancelled) return;
      setTelephonyFields({
        rssiDbm: info.rssiDbm,
        signalLevel: info.signalLevel,
        fineNetworkType:
          info.networkType !== "unknown" ? info.networkType : null,
        carrier: info.carrier,
        cellularGeneration: info.generation,
      });
    };

    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // NetInfo is the baseline (already works); telephony module only enriches when it
  // has real data, so prefer NetInfo's carrier/cellularGeneration when telephony is null.
  return {
    ...netInfoSnapshot,
    rssiDbm: telephonyFields.rssiDbm ?? null,
    signalLevel: telephonyFields.signalLevel ?? null,
    fineNetworkType: telephonyFields.fineNetworkType ?? null,
    carrier: netInfoSnapshot.carrier ?? telephonyFields.carrier ?? null,
    cellularGeneration:
      netInfoSnapshot.cellularGeneration ??
      telephonyFields.cellularGeneration ??
      null,
  };
}
