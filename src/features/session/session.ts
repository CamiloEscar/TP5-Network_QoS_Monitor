import {
  endSession as endSessionRow,
  insertSession,
} from "@/features/storage/sessions";
import { newId } from "@/features/storage/types";

export async function startSession(label?: string): Promise<string> {
  const session = {
    id: newId(),
    startedAt: Date.now(),
    endedAt: null,
    label: label ?? null,
  };
  await insertSession(session);
  return session.id;
}

export async function endSession(id: string): Promise<void> {
  await endSessionRow(id);
}
