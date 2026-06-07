import { Injectable, signal, computed, inject } from '@angular/core';
import { FirestoreStorageService } from './storage/firestore-storage.service';
import { LocalFileStorageService } from './storage/local-file-storage.service';
import { StorageStrategy, StorageMode } from './storage/storage.interface';
import { Account, Category, Transaction, Revenu, CatRule } from '../models';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_RULES, DEFAULT_SANTE_KEYWORDS } from '../models/defaults';

const MODE_KEY = 'budget_storage_mode';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private firestoreStorage = inject(FirestoreStorageService);
  private localStorage = inject(LocalFileStorageService);

  storageMode = signal<StorageMode>((localStorage.getItem(MODE_KEY) as StorageMode) ?? 'firestore');
  loading = signal(false);

  accounts      = signal<Account[]>(DEFAULT_ACCOUNTS());
  categories    = signal<Category[]>(DEFAULT_CATEGORIES());
  transactions  = signal<Transaction[]>([]);
  revenus       = signal<Record<string, Revenu>>({});
  rules         = signal<CatRule[]>(DEFAULT_RULES());
  santeKeywords = signal<string[]>(DEFAULT_SANTE_KEYWORDS());
  selectedMonth = signal<string>(this.currentMonth());

  private get storage(): StorageStrategy {
    return this.storageMode() === 'local' ? this.localStorage : this.firestoreStorage;
  }

  setStorageMode(mode: StorageMode) {
    localStorage.setItem(MODE_KEY, mode);
    this.storageMode.set(mode);
  }

  currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async loadAll() {
    this.loading.set(true);
    try {
      await this.storage.init();
      const data = await this.storage.loadAll();
      this.accounts.set(data.accounts);
      this.categories.set(data.categories);
      this.revenus.set(data.revenus);
      this.rules.set(data.rules ?? DEFAULT_RULES());
      this.santeKeywords.set(data.santeKeywords ?? DEFAULT_SANTE_KEYWORDS());
      this.transactions.set(data.transactions);
    } finally { this.loading.set(false); }
  }

  // Accounts
  async addAccount(acc: Omit<Account, 'id'>): Promise<Account> {
    const id = acc.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newAcc = { ...acc, id };
    const updated = [...this.accounts(), newAcc];
    this.accounts.set(updated);
    this.revenus.update(r => ({ ...r, [id]: { salaire: 0, pct: 0 } }));
    await this.storage.saveAccounts(updated);
    await this.storage.saveRevenus(this.revenus());
    return newAcc;
  }

  async updateAccount(id: string, changes: Partial<Account>) {
    const updated = this.accounts().map(a => a.id === id ? { ...a, ...changes } : a);
    this.accounts.set(updated);
    await this.storage.saveAccounts(updated);
  }

  async deleteAccount(id: string) {
    const updated = this.accounts().filter(a => a.id !== id);
    this.accounts.set(updated);
    this.transactions.update(txs => txs.filter(t => t.accountId !== id));
    this.revenus.update(r => { const n = { ...r }; delete n[id]; return n; });
    await this.storage.saveAccounts(updated);
    await this.storage.saveRevenus(this.revenus());
    await this.storage.deleteAccountTransactions(id);
  }

  // Categories
  async addCategory(cat: Category) {
    const updated = [...this.categories(), cat];
    this.categories.set(updated);
    await this.storage.saveCategories(updated);
  }

  async updateCategory(name: string, changes: Partial<Category>) {
    const updated = this.categories().map(c => c.name === name ? { ...c, ...changes } : c);
    this.categories.set(updated);
    if (changes.name) this.transactions.update(txs => txs.map(t => t.category === name ? { ...t, category: changes.name! } : t));
    await this.storage.saveCategories(updated);
  }

  async deleteCategory(name: string) {
    const updated = this.categories().filter(c => c.name !== name);
    this.categories.set(updated);
    this.transactions.update(txs => txs.map(t => t.category === name ? { ...t, category: 'Autre' } : t));
    await this.storage.saveCategories(updated);
  }

  // Rules
  async saveRules(list: CatRule[]) {
    this.rules.set(list);
    await this.storage.saveRules(list);
  }

  async saveSanteKeywords(list: string[]) {
    this.santeKeywords.set(list);
    await this.storage.saveSanteKeywords(list);
  }

  isSanteKeyword(label: string): boolean {
    const up = label.toUpperCase();
    return this.santeKeywords().some(k => up.includes(k.toUpperCase()));
  }

  // Revenus
  async updateRevenu(id: string, rev: Revenu) {
    this.revenus.update(r => ({ ...r, [id]: rev }));
    await this.storage.saveRevenus(this.revenus());
  }

  // Transactions
  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTx = await this.storage.addTransaction(tx);
    this.transactions.update(list => [...list, newTx]);
    return newTx;
  }

  async updateTransaction(id: string, changes: Partial<Transaction>) {
    await this.storage.updateTransaction(id, changes);
    this.transactions.update(list => list.map(t => t.id === id ? { ...t, ...changes } : t));
  }

  async updateTransactionsBulk(filter: (t: Transaction) => boolean, changes: Partial<Transaction>) {
    await this.storage.bulkUpdateTransactions(filter, changes);
    this.transactions.update(list => list.map(t => filter(t) ? { ...t, ...changes } : t));
  }

  async deleteTransaction(id: string) {
    await this.storage.deleteTransaction(id);
    this.transactions.update(list => list.filter(t => t.id !== id));
  }

  async importTransactions(txs: Omit<Transaction, 'id'>[], accountId: string): Promise<number> {
    const existing = this.txForAccount(accountId);
    const added = await this.storage.importTransactions(txs, accountId, existing);
    this.transactions.update(list => [...list, ...added]);
    return added.length;
  }

  // Helpers
  txForAccount(accountId: string, month?: string) {
    return this.transactions().filter(t =>
      t.accountId === accountId && (!month || (t.budgetMonth ?? t.month) === month)
    );
  }

  txForMonth(month: string) { return this.transactions().filter(t => t.month === month); }

  totalByCategory(txs: Transaction[]): Record<string, number> {
    return txs.reduce((map, t) => {
      if (t.amount < 0) map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
      return map;
    }, {} as Record<string, number>);
  }

  isContrib(t: Transaction): boolean { return t.amount > 0 && !!t.contribFrom && t.accountId === 'commun'; }
  isTaggedIncoming(t: Transaction): boolean { return t.amount > 0 && !!t.contribFrom; }
  personAccounts() { return this.accounts().filter(a => a.type === 'person'); }

  merchantKey(label: string): string { return label.replace(/\s+\d{2}\/\d{2}\/\d{2,4}$/, '').trim(); }

  autoCategorize(label: string): string {
    const d = label.toUpperCase();
    for (const rule of this.rules()) {
      if (rule.keywords.some(k => d.includes(k.toUpperCase()))) return rule.category;
    }
    return 'Divers';
  }
}
