import { Injectable } from '@angular/core';
import { StorageStrategy, StorageData } from './storage.interface';
import { Account, Category, Transaction, Revenu, CatRule } from '../../models';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_RULES, DEFAULT_SANTE_KEYWORDS } from '../../models/defaults';

const IDB_NAME = 'budget-fs';
const IDB_STORE = 'handles';
const HANDLE_KEY = 'dir';
const FILE_NAME = 'budget_data.json';

@Injectable({ providedIn: 'root' })
export class LocalFileStorageService implements StorageStrategy {
  readonly mode = 'local' as const;
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private data: StorageData | null = null;

  async init() {
    const handle = await this.loadHandleFromIDB();
    if (handle) {
      const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') { this.dirHandle = handle; return; }
      const req = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (req === 'granted') { this.dirHandle = handle; return; }
    }
    await this.pickFolder();
  }

  async pickFolder(): Promise<boolean> {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      this.dirHandle = handle;
      await this.saveHandleToIDB(handle);
      return true;
    } catch { return false; }
  }

  get hasFolder() { return this.dirHandle !== null; }

  async loadAll(): Promise<StorageData> {
    if (!this.dirHandle) throw new Error('No folder selected');
    try {
      const fh = await this.dirHandle.getFileHandle(FILE_NAME);
      const file = await fh.getFile();
      const text = await file.text();
      const raw = JSON.parse(text);
      this.data = {
        accounts: raw.accounts ?? DEFAULT_ACCOUNTS(),
        categories: raw.categories ?? DEFAULT_CATEGORIES(),
        revenus: raw.revenus ?? {},
        transactions: this.flattenTx(raw),
        rules: raw.rules ?? DEFAULT_RULES(),
        santeKeywords: raw.santeKeywords ?? DEFAULT_SANTE_KEYWORDS(),
      };
      return this.data;
    } catch {
      this.data = { accounts: DEFAULT_ACCOUNTS(), categories: DEFAULT_CATEGORIES(), revenus: {}, transactions: [], rules: DEFAULT_RULES(), santeKeywords: DEFAULT_SANTE_KEYWORDS() };
      await this.persist();
      return this.data;
    }
  }

  private flattenTx(raw: any): Transaction[] {
    // Support old format (expenses per account) and new flat format
    if (raw.transactions) return raw.transactions;
    if (raw.expenses) {
      return Object.entries(raw.expenses as Record<string, any[]>).flatMap(([accId, txs]) =>
        txs.map(t => ({ ...t, accountId: accId, month: (t.date ?? '').substring(0, 7) }))
      );
    }
    return [];
  }

  private async persist() {
    if (!this.dirHandle || !this.data) return;
    const fh = await this.dirHandle.getFileHandle(FILE_NAME, { create: true });
    const writable = await fh.createWritable();
    await writable.write(JSON.stringify(this.data, null, 2));
    await writable.close();
  }

  async saveAccounts(list: Account[]) { this.data!.accounts = list; await this.persist(); }
  async saveCategories(list: Category[]) { this.data!.categories = list; await this.persist(); }
  async saveRevenus(map: Record<string, Revenu>) { this.data!.revenus = map; await this.persist(); }
  async saveRules(list: CatRule[]) { this.data!.rules = list; await this.persist(); }
  async saveSanteKeywords(list: string[]) { this.data!.santeKeywords = list; await this.persist(); }

  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTx = { ...tx, id: crypto.randomUUID() };
    this.data!.transactions.push(newTx);
    await this.persist();
    return newTx;
  }

  async updateTransaction(id: string, changes: Partial<Transaction>) {
    this.data!.transactions = this.data!.transactions.map(t => t.id === id ? { ...t, ...changes } : t);
    await this.persist();
  }

  async deleteTransaction(id: string) {
    this.data!.transactions = this.data!.transactions.filter(t => t.id !== id);
    await this.persist();
  }

  async bulkUpdateTransactions(filter: (t: Transaction) => boolean, changes: Partial<Transaction>) {
    this.data!.transactions = this.data!.transactions.map(t => filter(t) ? { ...t, ...changes } : t);
    await this.persist();
  }

  async importTransactions(txs: Omit<Transaction, 'id'>[], accountId: string, existing: Transaction[]): Promise<Transaction[]> {
    const newTxs = txs.filter(t => !existing.some(e => e.date === t.date && e.label === t.label && Math.abs(e.amount - t.amount) < 0.01));
    const added = newTxs.map(tx => ({ ...tx, id: crypto.randomUUID() }));
    this.data!.transactions.push(...added);
    await this.persist();
    return added;
  }

  async deleteAccountTransactions(accountId: string) {
    this.data!.transactions = this.data!.transactions.filter(t => t.accountId !== accountId);
    await this.persist();
  }

  private openIDB(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => (e.target as any).result.createObjectStore(IDB_STORE);
      req.onsuccess = e => res((e.target as any).result);
      req.onerror = rej;
    });
  }

  private async saveHandleToIDB(handle: FileSystemDirectoryHandle) {
    const db = await this.openIDB();
    return new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => res(); tx.onerror = rej;
    });
  }

  private async loadHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.openIDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
        req.onsuccess = () => res(req.result ?? null); req.onerror = rej;
      });
    } catch { return null; }
  }
}
