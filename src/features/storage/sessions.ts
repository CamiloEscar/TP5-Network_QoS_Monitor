import { getDb } from "./db";
import type { Session, SessionSummary } from "./types";

type SessionRow = {
  id: string;
  started_at: number;
  ended_at: number | null;
  label: string | null;
  measurement_count: number;
};

export async function insertSession(s: Session): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO sessions (id, started_at, ended_at, label) VALUES (?, ?, ?, ?)",
    s.id,
    s.startedAt,
    s.endedAt,
    s.label,
  );
}

export async function listSessions(): Promise<SessionSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT s.*, COUNT(m.id) AS measurement_count
     FROM sessions s
     LEFT JOIN measurements m ON m.session_id = s.id
     GROUP BY s.id
     ORDER BY s.started_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    label: row.label,
    measurementCount: row.measurement_count,
  }));
}

export async function endSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sessions SET ended_at = ? WHERE id = ?",
    Date.now(),
    id,
  );
}
