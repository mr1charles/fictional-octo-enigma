const DB_NAME = 'web3ds-db';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('roms')) db.createObjectStore('roms', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('states')) db.createObjectStore('states', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const res = fn(s);
    t.oncomplete = () => resolve(res?.result ?? res);
    t.onerror = () => reject(t.error);
  });
}

export const Storage = {
  saveRom: (rom) => tx('roms', 'readwrite', (s) => s.put(rom)),
  getRoms: () => tx('roms', 'readonly', (s) => s.getAll()),
  saveState: (state) => tx('states', 'readwrite', (s) => s.put(state)),
  getState: (id) => tx('states', 'readonly', (s) => s.get(id)),
  setSetting: (id, value) => tx('settings', 'readwrite', (s) => s.put({ id, value })),
  async getSetting(id, fallback = null) {
    const row = await tx('settings', 'readonly', (s) => s.get(id));
    return row?.value ?? fallback;
  },
  setMeta: (id, value) => tx('meta', 'readwrite', (s) => s.put({ id, value })),
  async getMeta(id, fallback = null) {
    const row = await tx('meta', 'readonly', (s) => s.get(id));
    return row?.value ?? fallback;
  }
};
