import { parseReport, type MaintenanceReport } from "./model";
const DB = "maintenance-authorization-v1";
const STORE = "reports";
async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Armazenamento cancelado."));
    };
  });
}
export const storage = {
  all: async () =>
    (await operation<MaintenanceReport[]>("readonly", (s) => s.getAll()))
      .map(parseReport)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  put: async (r: MaintenanceReport) => {
    const saved = parseReport({ ...r, updatedAt: new Date().toISOString() });
    await operation("readwrite", (s) => s.put(saved));
    return saved;
  },
  remove: async (id: string) => {
    await operation("readwrite", (s) => s.delete(id));
  },
};
// A leitura legada é isolada e não cria, apaga nem modifica o banco de outros relatórios.
export async function legacyReports(): Promise<MaintenanceReport[]> {
  if (!indexedDB.databases) return [];
  if (
    !(await indexedDB.databases()).some(
      (d) => d.name === "relatorio-servicos-nao-vinculados",
    )
  )
    return [];
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("relatorio-servicos-nao-vinculados");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    if (!db.objectStoreNames.contains("reports")) return [];
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const r = db
        .transaction("reports", "readonly")
        .objectStore("reports")
        .getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return rows
      .filter(
        (r) =>
          r &&
          typeof r === "object" &&
          (r as { kind?: string }).kind === "maintenance-auth",
      )
      .map(parseReport);
  } finally {
    db.close();
  }
}
