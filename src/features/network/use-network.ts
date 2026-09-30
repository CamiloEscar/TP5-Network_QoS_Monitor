import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkType =
  | 'unknown'
  | 'none'
  | 'cellular'
  | 'wifi'
  | 'bluetooth'
  | 'ethernet'
  | 'wimax'
  | 'vpn'
  | 'other';

export type CellularGeneration = '2g' | '3g' | '4g' | '5g';

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
};

function toSnapshot(state: NetInfoState): NetworkSnapshot {
  const common = {
    type: state.type as NetworkType,
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    isExpensive: state.details?.isConnectionExpensive ?? false,
  };

  if (state.type === 'wifi') {
    return {
      ...common,
      ssid: state.details.ssid,
      ipAddress: state.details.ipAddress,
      wifiStrength: state.details.strength ?? null,
      linkSpeed: state.details.linkSpeed ?? null,
    };
  }

  if (state.type === 'cellular') {
    return {
      ...common,
      carrier: state.details.carrier,
      cellularGeneration: (state.details.cellularGeneration ?? null) as CellularGeneration | null,
    };
  }

  return common;
}

const INITIAL: NetworkSnapshot = {
  type: 'unknown',
  isConnected: false,
  isInternetReachable: false,
  isExpensive: false,
};

export function useNetwork(): NetworkSnapshot {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(INITIAL);

  useEffect(() => NetInfo.addEventListener((state) => setSnapshot(toSnapshot(state))), []);

  return snapshot;
}