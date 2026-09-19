// The founder's pitch video, kept on this phone. localStorage (storage.ts) is far too small for
// video, so the Blob goes to IndexedDB as a single record. An in-memory copy keeps the current
// session working when IndexedDB is unavailable (private mode, a sandboxed frame, quota): then the
// video just doesn't survive a reload. answers.pitchVideo stays the source of truth: callers
// ignore a stored video when that answer is empty.

const DB_NAME = 'blendr-video';
const STORE = 'videos';
const KEY = 'pitch';

let inMemory: Blob | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
  });
}

/** Runs one request in its own transaction; resolves with its result once the transaction commits. */
async function inStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function savePitchVideo(blob: Blob): Promise<void> {
  inMemory = blob;
  try {
    await inStore('readwrite', (store) => store.put(blob, KEY));
  } catch {
    // IndexedDB unavailable: the in-memory copy still serves this session.
  }
}

export async function loadPitchVideo(): Promise<Blob | null> {
  if (inMemory) return inMemory;
  try {
    const stored = await inStore('readonly', (store) => store.get(KEY));
    return stored instanceof Blob ? stored : null;
  } catch {
    return null;
  }
}

export async function clearPitchVideo(): Promise<void> {
  inMemory = null;
  try {
    await inStore('readwrite', (store) => store.delete(KEY));
  } catch {
    // Nothing stored, or IndexedDB unavailable.
  }
}
