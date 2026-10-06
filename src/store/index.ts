import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import type { CancellationToken } from "@/features/probes";
import { createCancellationToken } from "@/features/probes";
import type {
  NetworkSnapshot,
  CellularGeneration,
} from "@/features/network/use-network";
import { queryMeasurements } from "@/features/storage/measurements";
import { listSessions } from "@/features/storage/sessions";
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings as persistSettings,
  type Settings,
  type SettingsPatch,
} from "@/features/storage/settings";
import type {
  HistoryFilter,
  MeasurementRecord,
  SessionSummary,
} from "@/features/storage/types";
import {
  startSession as startSessionRow,
  endSession as endSessionRow,
} from "@/features/session/session";
import { runMeasurement } from "@/features/session/run-measurement";

export type TelephonyInfo = {
  carrier: string | null;
  networkType: string;
  generation: CellularGeneration | null;
  rssiDbm: number | null;
  signalLevel: number | null;
};

export type RunStatus =
  "idle" | "probing" | "throughput" | "persisting" | "error";

export type RunProgress = {
  stage: "rtt" | "throughput" | "persisting";
  host?: string;
  done?: number;
  total?: number;
};

export type StoreState = {
  network: NetworkSnapshot;
  telephony: TelephonyInfo | null;
  run: {
    status: RunStatus;
    progress: RunProgress | null;
    lastMeasurement: MeasurementRecord | null;
    error: string | null;
  };
  session: { activeId: string | null; startedAt: number | null };
  settings: Settings;
  history: {
    sessions: SessionSummary[];
    filter: HistoryFilter;
    rows: MeasurementRecord[];
    loading: boolean;
  };
  startMeasurement: (opts?: {
    throughput?: boolean;
    quick?: boolean;
  }) => Promise<void>;
  cancelMeasurement: () => void;
  startSession: (label?: string) => Promise<void>;
  endSession: () => Promise<void>;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  loadHistory: () => Promise<void>;
  setFilter: (f: Partial<HistoryFilter>) => void;
};

let activeToken: CancellationToken | null = null;

export const store = createStore<StoreState>()((set, get) => ({
  network: {
    type: "unknown",
    isConnected: false,
    isInternetReachable: false,
    isExpensive: false,
  },
  telephony: null,
  run: { status: "idle", progress: null, lastMeasurement: null, error: null },
  session: { activeId: null, startedAt: null },
  settings: DEFAULT_SETTINGS,
  history: { sessions: [], filter: {}, rows: [], loading: false },

  startMeasurement: async (opts) => {
    if (get().run.status !== "idle") return;

    let sessionId = get().session.activeId;
    if (!sessionId) {
      sessionId = await startSessionRow();
      set({ session: { activeId: sessionId, startedAt: Date.now() } });
    }

    const token = createCancellationToken();
    activeToken = token;
    set((s) => ({ run: { ...s.run, status: "probing", error: null } }));

    const stageToStatus = {
      rtt: "probing",
      throughput: "throughput",
      persisting: "persisting",
    } as const;

    try {
      const record = await runMeasurement(
        { throughput: opts?.throughput, quick: opts?.quick, sessionId },
        token,
        {
          network: get().network,
          settings: get().settings,
          onProgress: (p) => {
            set((s) => ({
              run: { ...s.run, status: stageToStatus[p.stage], progress: p },
            }));
          },
        },
      );
      set((s) => ({
        run: {
          ...s.run,
          status: "idle",
          progress: null,
          lastMeasurement: record,
          error: null,
        },
      }));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        set((s) => ({
          run: { ...s.run, status: "idle", progress: null, error: null },
        }));
      } else {
        const message = e instanceof Error ? e.message : String(e);
        set((s) => ({ run: { ...s.run, status: "error", error: message } }));
      }
    } finally {
      activeToken = null;
    }
  },

  cancelMeasurement: () => {
    activeToken?.cancel();
    activeToken = null;
    set((s) => ({
      run: { ...s.run, status: "idle", progress: null, error: null },
    }));
  },

  startSession: async (label?: string) => {
    const id = await startSessionRow(label);
    set({ session: { activeId: id, startedAt: Date.now() } });
  },

  endSession: async () => {
    const { activeId } = get().session;
    if (activeId) await endSessionRow(activeId);
    set({ session: { activeId: null, startedAt: null } });
  },

  updateSettings: async (patch) => {
    const settings = await persistSettings(patch);
    set({ settings });
  },

  loadHistory: async () => {
    set((s) => ({ history: { ...s.history, loading: true } }));
    const { filter } = get().history;
    const [sessions, rows] = await Promise.all([
      listSessions(),
      queryMeasurements(filter),
    ]);
    set((s) => ({ history: { ...s.history, sessions, rows, loading: false } }));
  },

  setFilter: (f) => {
    set((s) => ({
      history: { ...s.history, filter: { ...s.history.filter, ...f } },
    }));
  },
}));

void getSettings().then((settings) => store.setState({ settings }));

export function useRunStatus(): RunStatus {
  return useStore(store, (s) => s.run.status);
}

export function useLastMeasurement(): MeasurementRecord | null {
  return useStore(store, (s) => s.run.lastMeasurement);
}

export function useActiveSession(): StoreState["session"] {
  return useStore(store, (s) => s.session);
}

export function useHistoryRows(): MeasurementRecord[] {
  return useStore(store, (s) => s.history.rows);
}

export function useSettings(): Settings {
  return useStore(store, (s) => s.settings);
}
