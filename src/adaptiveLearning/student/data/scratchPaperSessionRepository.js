import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readJson,
  removeStoredValue,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import { createClientId } from "../../shared/infrastructure/clientId.js";

const SNAPSHOT_CONTRACT_VERSION = 1;
const SNAPSHOT_DATABASE_NAME = "adaptive-scratch-paper-v1";
const SNAPSHOT_STORE_NAME = "snapshots";
const SNAPSHOT_JOURNAL_PREFIX = "adaptive-scratch-paper-snapshot-v1-";
const SESSION_STORAGE_PREFIX = "adaptive-scratch-paper-session-v1-";
const TLDRAW_DATABASE_PREFIX = "TLDRAW_DOCUMENT_v2";
const TLDRAW_DATABASE_INDEX_KEY = "TLDRAW_DB_NAME_INDEX_v2";

const memorySnapshots = new Map();
const pendingWrites = new Map();
const persistenceGenerations = new Map();
const knownPersistenceKeys = new Set();
let databasePromise = null;

const journalKey = (persistenceKey) =>
  `${SNAPSHOT_JOURNAL_PREFIX}${encodeURIComponent(persistenceKey)}`;

/**
 *
 * @param persistenceKey
 */
function currentGeneration(persistenceKey) {
  return persistenceGenerations.get(persistenceKey) || 0;
}

/**
 *
 * @param persistenceKey
 */
function advanceGeneration(persistenceKey) {
  const next = currentGeneration(persistenceKey) + 1;
  persistenceGenerations.set(persistenceKey, next);
  return next;
}

/**
 *
 * @param snapshot
 */
function snapshotRecord(snapshot) {
  return {
    contractVersion: SNAPSHOT_CONTRACT_VERSION,
    snapshot,
    updatedAt: new Date().toISOString(),
  };
}

/**
 *
 * @param record
 */
function validSnapshotRecord(record) {
  return record?.contractVersion === SNAPSHOT_CONTRACT_VERSION &&
    record.snapshot
    ? record
    : null;
}

/**
 *
 */
function openSnapshotDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("INDEXED_DB_UNAVAILABLE"));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    let request;
    try {
      request = window.indexedDB.open(SNAPSHOT_DATABASE_NAME, 1);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
        request.result.createObjectStore(SNAPSHOT_STORE_NAME, {
          keyPath: "persistenceKey",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("INDEXED_DB_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("INDEXED_DB_OPEN_BLOCKED"));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

/**
 *
 * @param persistenceKey
 */
async function readIndexedDbRecord(persistenceKey) {
  const database = await openSnapshotDatabase();
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = database
        .transaction(SNAPSHOT_STORE_NAME, "readonly")
        .objectStore(SNAPSHOT_STORE_NAME)
        .get(persistenceKey);
    } catch (error) {
      reject(error);
      return;
    }
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(request.error || new Error("INDEXED_DB_READ_FAILED"));
  });
}

/**
 *
 * @param persistenceKey
 * @param record
 * @param generation
 */
async function writeIndexedDbRecord(persistenceKey, record, generation) {
  if (generation !== currentGeneration(persistenceKey))
    return { status: "superseded" };
  const database = await openSnapshotDatabase();
  if (generation !== currentGeneration(persistenceKey))
    return { status: "superseded" };
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction(SNAPSHOT_STORE_NAME, "readwrite");
      transaction
        .objectStore(SNAPSHOT_STORE_NAME)
        .put({ persistenceKey, ...record });
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve({ status: "persisted" });
    transaction.onerror = () =>
      reject(transaction.error || new Error("INDEXED_DB_WRITE_FAILED"));
    transaction.addEventListener("abort", () =>
      reject(transaction.error || new Error("INDEXED_DB_WRITE_ABORTED")),
    );
  });
}

/**
 *
 * @param persistenceKey
 */
async function deleteIndexedDbRecord(persistenceKey) {
  let database;
  try {
    database = await openSnapshotDatabase();
  } catch {
    return { status: "unavailable" };
  }
  return new Promise((resolve) => {
    let transaction;
    try {
      transaction = database.transaction(SNAPSHOT_STORE_NAME, "readwrite");
      transaction.objectStore(SNAPSHOT_STORE_NAME).delete(persistenceKey);
    } catch {
      resolve({ status: "error" });
      return;
    }
    transaction.oncomplete = () => resolve({ status: "deleted" });
    transaction.onerror = () => resolve({ status: "error" });
    transaction.addEventListener("abort", () => resolve({ status: "error" }));
  });
}

/**
 *
 * @param databaseName
 */
function removeLegacyDatabaseIndex(databaseName) {
  const names = readJson(TLDRAW_DATABASE_INDEX_KEY, []);
  if (!Array.isArray(names) || !names.includes(databaseName)) return;
  try {
    writeJson(
      TLDRAW_DATABASE_INDEX_KEY,
      names.filter((name) => name !== databaseName),
    );
  } catch {
    // The legacy index is best-effort cleanup only.
  }
}

/**
 *
 * @param persistenceKey
 */
function deleteLegacyTldrawDatabase(persistenceKey) {
  if (typeof window === "undefined" || !window.indexedDB?.deleteDatabase) {
    return Promise.resolve({ status: "unavailable" });
  }
  const databaseName = `${TLDRAW_DATABASE_PREFIX}${persistenceKey}`;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (status) => {
      if (settled) return;
      settled = true;
      if (status === "deleted") removeLegacyDatabaseIndex(databaseName);
      resolve({ status });
    };
    try {
      const request = window.indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => finish("deleted");
      request.onerror = () => finish("error");
      request.onblocked = () => finish("blocked");
    } catch {
      finish("error");
    }
  });
}

/**
 *
 * @param scope
 */
export function scratchPaperPersistenceKey(scope) {
  const storageKey = storageKeys.scratchPaperSession(scope);
  const current = readJson(storageKey, "");
  if (typeof current === "string" && current) {
    knownPersistenceKeys.add(current);
    return current;
  }
  const next = `adaptive-scratch-paper:${scope}:${createClientId()}`;
  knownPersistenceKeys.add(next);
  try {
    writeJson(storageKey, next);
  } catch {
    // Restricted storage still gets a stable key for the current component lifetime.
  }
  return next;
}

/**
 *
 * @param persistenceKey
 */
export async function readScratchPaperSnapshot(persistenceKey) {
  if (!persistenceKey) return null;
  knownPersistenceKeys.add(persistenceKey);
  const memoryRecord = validSnapshotRecord(memorySnapshots.get(persistenceKey));
  if (memoryRecord) return memoryRecord.snapshot;

  const journalRecord = validSnapshotRecord(
    readJson(journalKey(persistenceKey), null),
  );
  if (journalRecord) {
    memorySnapshots.set(persistenceKey, journalRecord);
    return journalRecord.snapshot;
  }

  try {
    const indexedDbRecord = validSnapshotRecord(
      await readIndexedDbRecord(persistenceKey),
    );
    if (!indexedDbRecord) return null;
    memorySnapshots.set(persistenceKey, indexedDbRecord);
    try {
      writeJson(journalKey(persistenceKey), indexedDbRecord);
    } catch {
      // IndexedDB remains the durable source when the journal is unavailable.
    }
    return indexedDbRecord.snapshot;
  } catch {
    return null;
  }
}

/**
 *
 * @param persistenceKey
 * @param snapshot
 */
export function persistScratchPaperSnapshot(persistenceKey, snapshot) {
  if (!persistenceKey || !snapshot)
    return Promise.resolve({ status: "ignored" });
  knownPersistenceKeys.add(persistenceKey);
  const record = snapshotRecord(snapshot);
  const generation = currentGeneration(persistenceKey);
  memorySnapshots.set(persistenceKey, record);

  let journalPersisted = false;
  try {
    journalPersisted = writeJson(journalKey(persistenceKey), record) !== false;
  } catch {
    journalPersisted = false;
  }

  const previous = pendingWrites.get(persistenceKey) || Promise.resolve();
  const pending = previous
    .catch(() => {})
    .then(() => writeIndexedDbRecord(persistenceKey, record, generation))
    .catch(() => ({
      status: journalPersisted ? "journal-only" : "memory-only",
    }));
  pendingWrites.set(persistenceKey, pending);
  void pending.finally(() => {
    if (pendingWrites.get(persistenceKey) === pending)
      pendingWrites.delete(persistenceKey);
  });
  return pending;
}

/**
 *
 * @param persistenceKey
 */
export function flushScratchPaperSnapshot(persistenceKey) {
  return (
    pendingWrites.get(persistenceKey) || Promise.resolve({ status: "idle" })
  );
}

/**
 *
 * @param scope
 */
export async function clearScratchPaperSession(scope) {
  const storageKey = storageKeys.scratchPaperSession(scope);
  const persistenceKey = readJson(storageKey, "");
  try {
    removeStoredValue(storageKey);
  } catch {
    // Cleanup must never block assessment completion.
  }
  if (typeof persistenceKey !== "string" || !persistenceKey)
    return { status: "empty" };

  advanceGeneration(persistenceKey);
  memorySnapshots.delete(persistenceKey);
  knownPersistenceKeys.delete(persistenceKey);
  try {
    removeStoredValue(journalKey(persistenceKey));
  } catch {
    // The IndexedDB record is still removed below when local storage is restricted.
  }

  await (pendingWrites.get(persistenceKey) || Promise.resolve()).catch(
    () => {},
  );
  pendingWrites.delete(persistenceKey);
  const [applicationRecord, legacyDatabase] = await Promise.all([
    deleteIndexedDbRecord(persistenceKey),
    deleteLegacyTldrawDatabase(persistenceKey),
  ]);
  return { status: "cleared", applicationRecord, legacyDatabase };
}

/**
 *
 */
export async function clearAllScratchPaperSessions() {
  const scopes = [];
  if (typeof window !== "undefined") {
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(SESSION_STORAGE_PREFIX)) scopes.push(key);
      }
    } catch {
      // Known in-memory keys are still cleared below.
    }
  }

  const persistenceKeys = new Set(knownPersistenceKeys);
  for (const storageKey of scopes) {
    const persistenceKey = readJson(storageKey, "");
    if (typeof persistenceKey === "string" && persistenceKey)
      persistenceKeys.add(persistenceKey);
    try {
      removeStoredValue(storageKey);
    } catch {
      // Continue clearing the remaining sessions.
    }
  }

  for (const persistenceKey of persistenceKeys) {
    advanceGeneration(persistenceKey);
    memorySnapshots.delete(persistenceKey);
    try {
      removeStoredValue(journalKey(persistenceKey));
    } catch {
      // IndexedDB cleanup continues below.
    }
  }

  await Promise.all(
    [...persistenceKeys].map(async (persistenceKey) => {
      await (pendingWrites.get(persistenceKey) || Promise.resolve()).catch(
        () => {},
      );
      pendingWrites.delete(persistenceKey);
      await Promise.all([
        deleteIndexedDbRecord(persistenceKey),
        deleteLegacyTldrawDatabase(persistenceKey),
      ]);
    }),
  );
  knownPersistenceKeys.clear();
  return { status: "cleared", count: persistenceKeys.size };
}
