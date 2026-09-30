import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { MIGRATIONS } from "./migrations";

const DB_NAME = "qos-monitor.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= version) continue;
    await migration.up(db);
    version = migration.version;
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}

export function getDb(): Promise<SQLiteDatabase> {
  dbPromise ??= openDatabaseAsync(DB_NAME).then(async (db) => {
    await migrate(db);
    return db;
  });
  return dbPromise;
}

export async function openDb(): Promise<void> {
  await getDb();
}
