import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DoctorQuestion } from "@/lib/llm/questions";
import type { NormalizedValue } from "@/lib/engine/types";
import type { WorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

/**
 * Local-only persistence. Every report a user drops in lives here and nowhere
 * else — there is no sync, no export, and `wipeAll` really does empty it.
 */

export const DB_NAME = "labloom";
export const DB_VERSION = 2;

export type ExtractionSource = "heuristic" | "llm" | "demo";

export interface StoredReport {
  /** SHA-256 of the file bytes — re-uploading the same file is a no-op */
  hash: string;
  filename: string;
  addedAt: string;
  lab: string;
  sampledAt: string;
  source: ExtractionSource;
  values: NormalizedValue[];
}

export interface ReviewItem {
  hash: string;
  filename: string;
  addedAt: string;
  reason: string;
  /** the extracted text, so the user can see what we choked on */
  lines: string[];
}

export interface StoredQuestions {
  id: string;
  generatedAt: string;
  questions: DoctorQuestion[];
}

interface LabloomDB extends DBSchema {
  reports: { key: string; value: StoredReport; indexes: { sampledAt: string } };
  review: { key: string; value: ReviewItem };
  questions: { key: string; value: StoredQuestions };
}

let dbPromise: Promise<IDBPDatabase<LabloomDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<LabloomDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LabloomDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("reports")) {
          const reports = db.createObjectStore("reports", { keyPath: "hash" });
          reports.createIndex("sampledAt", "sampledAt");
        }
        if (!db.objectStoreNames.contains("review")) {
          db.createObjectStore("review", { keyPath: "hash" });
        }
        if (!db.objectStoreNames.contains("questions")) {
          db.createObjectStore("questions", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Closes the open connection and forces the next getDb() to reopen. An open
 * connection blocks deleteDatabase indefinitely, so anything that deletes the
 * database must close it first.
 */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const pending = dbPromise;
  dbPromise = null;
  (await pending).close();
}

/** Drops the database entirely — the hardest form of the wipe control. */
export async function deleteDatabase(): Promise<void> {
  await closeDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    // Another tab holds a connection; the delete completes when it closes.
    request.onblocked = () => resolve();
  });
}

/** SHA-256 of the file bytes, hex-encoded. */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hasReport(hash: string): Promise<boolean> {
  return (await (await getDb()).getKey("reports", hash)) !== undefined;
}

/** Returns false when the report was already stored, so callers can say so. */
export async function putReport(report: StoredReport): Promise<boolean> {
  const db = await getDb();
  const tx = db.transaction("reports", "readwrite");
  const existing = await tx.store.getKey(report.hash);
  if (existing !== undefined) {
    await tx.done;
    return false;
  }
  await tx.store.put(report);
  await tx.done;
  return true;
}

export async function listReports(): Promise<StoredReport[]> {
  const reports = await (await getDb()).getAll("reports");
  return reports.sort((a, b) => a.sampledAt.localeCompare(b.sampledAt));
}

export async function listReportsForMode(mode: WorkspaceMode): Promise<StoredReport[]> {
  const reports = await listReports();
  return reports.filter((report) =>
    mode === "demo" ? report.source === "demo" : report.source !== "demo",
  );
}

export async function deleteReport(hash: string): Promise<void> {
  await (await getDb()).delete("reports", hash);
}

export async function deleteReportsBySource(source: ExtractionSource): Promise<number> {
  const reports = await listReports();
  const matches = reports.filter((report) => report.source === source);
  const db = await getDb();
  const tx = db.transaction("reports", "readwrite");
  await Promise.all(matches.map((report) => tx.store.delete(report.hash)));
  await tx.done;
  return matches.length;
}

export async function deleteReportsForMode(mode: WorkspaceMode): Promise<number> {
  const reports = await listReports();
  const matches = reports.filter((report) =>
    mode === "demo" ? report.source === "demo" : report.source !== "demo",
  );
  const db = await getDb();
  const tx = db.transaction("reports", "readwrite");
  await Promise.all(matches.map((report) => tx.store.delete(report.hash)));
  await tx.done;
  return matches.length;
}

export async function allValues(): Promise<NormalizedValue[]> {
  return (await listReports()).flatMap((r) => r.values);
}

export async function putReviewItem(item: ReviewItem): Promise<void> {
  await (await getDb()).put("review", item);
}

export async function listReviewItems(): Promise<ReviewItem[]> {
  return (await getDb()).getAll("review");
}

export async function deleteReviewItem(hash: string): Promise<void> {
  await (await getDb()).delete("review", hash);
}

export async function clearReviewItems(): Promise<void> {
  await (await getDb()).clear("review");
}

function questionKey(mode: WorkspaceMode): string {
  return `latest:${mode}`;
}

export async function saveQuestions(
  questions: DoctorQuestion[],
  generatedAt: string,
  mode: WorkspaceMode = "real",
): Promise<void> {
  await (await getDb()).put("questions", { id: questionKey(mode), generatedAt, questions });
}

export async function loadQuestions(
  mode: WorkspaceMode = "real",
): Promise<StoredQuestions | undefined> {
  const db = await getDb();
  return (
    (await db.get("questions", questionKey(mode))) ??
    (mode === "real" ? db.get("questions", "latest") : undefined)
  );
}

export async function deleteQuestions(mode: WorkspaceMode = "real"): Promise<void> {
  const db = await getDb();
  await db.delete("questions", questionKey(mode));
  if (mode === "real") {
    await db.delete("questions", "latest");
  }
}

/** The wipe control. Empties every store; the key is cleared by the caller. */
export async function wipeAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["reports", "review", "questions"], "readwrite");
  await Promise.all([
    tx.objectStore("reports").clear(),
    tx.objectStore("review").clear(),
    tx.objectStore("questions").clear(),
  ]);
  await tx.done;
}
