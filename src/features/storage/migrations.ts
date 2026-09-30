import type { SQLiteDatabase } from "expo-sqlite";

export type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          label TEXT
        );
        CREATE TABLE IF NOT EXISTS measurements (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions(id),
          ts INTEGER NOT NULL,
          lat REAL,
          lon REAL,
          accuracy REAL,
          network_type TEXT NOT NULL,
          cellular_generation TEXT,
          carrier TEXT,
          rssi_dbm INTEGER,
          signal_level INTEGER,
          ping_min_ms REAL,
          ping_avg_ms REAL,
          ping_max_ms REAL,
          ping_jitter_ms REAL,
          ping_loss REAL,
          ping_hosts TEXT,
          throughput_down_mbps REAL,
          throughput_up_mbps REAL,
          payload_bytes INTEGER,
          backend_url TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_meas_ts ON measurements(ts);
        CREATE INDEX IF NOT EXISTS idx_meas_latlon ON measurements(lat, lon);
        CREATE INDEX IF NOT EXISTS idx_meas_session ON measurements(session_id);
        CREATE INDEX IF NOT EXISTS idx_meas_network ON measurements(network_type);
      `);
    },
  },
];
