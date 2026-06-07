import { Account, Category, Transaction, Revenu, CatRule } from '../../models';

export type StorageMode = 'firestore' | 'local';

export interface StorageStrategy {
  readonly mode: StorageMode;
  init(): Promise<void>;
  loadAll(): Promise<StorageData>;
  saveAccounts(list: Account[]): Promise<void>;
  saveCategories(list: Category[]): Promise<void>;
  saveRevenus(map: Record<string, Revenu>): Promise<void>;
  saveRules(list: CatRule[]): Promise<void>;
  saveSanteKeywords(list: string[]): Promise<void>;
  addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction>;
  updateTransaction(id: string, changes: Partial<Transaction>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  bulkUpdateTransactions(filter: (t: Transaction) => boolean, changes: Partial<Transaction>): Promise<void>;
  importTransactions(txs: Omit<Transaction, 'id'>[], accountId: string, existing: Transaction[]): Promise<Transaction[]>;
  deleteAccountTransactions(accountId: string): Promise<void>;
}

export interface StorageData {
  accounts: Account[];
  categories: Category[];
  revenus: Record<string, Revenu>;
  transactions: Transaction[];
  rules: CatRule[];
  santeKeywords: string[];
}
