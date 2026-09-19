export const STORAGE_KEY = 'blendr-v1';

export function loadSaved(): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function save(value: unknown): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota): the app keeps working in memory.
  }
}
