import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, updateDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { StorageStrategy, StorageData } from './storage.interface';
import { Account, Category, Transaction, Revenu, CatRule } from '../../models';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_RULES, DEFAULT_SANTE_KEYWORDS } from '../../models/defaults';

@Injectable({ providedIn: 'root' })
export class FirestoreStorageService implements StorageStrategy {
  readonly mode = 'firestore' as const;
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  private get uid() { return this.auth.currentUser?.uid ?? 'anon'; }
  private userDoc(path: string) { return doc(this.firestore, `users/${this.uid}/${path}`); }
  private txCol() { return collection(this.firestore, `users/${this.uid}/transactions`); }

  async init() {}

  async loadAll(): Promise<StorageData> {
    const [accSnap, catSnap, revSnap, rulesSnap, santeSnap, txSnap] = await Promise.all([
      getDoc(this.userDoc('config/accounts')),
      getDoc(this.userDoc('config/categories')),
      getDoc(this.userDoc('config/revenus')),
      getDoc(this.userDoc('config/rules')),
      getDoc(this.userDoc('config/sante')),
      getDocs(this.txCol()),
    ]);
    return {
      accounts: accSnap.exists() ? accSnap.data()['list'] : DEFAULT_ACCOUNTS(),
      categories: catSnap.exists() ? catSnap.data()['list'] : DEFAULT_CATEGORIES(),
      revenus: revSnap.exists() ? (revSnap.data() as any) : {},
      rules: rulesSnap.exists() ? rulesSnap.data()['list'] : DEFAULT_RULES(),
      santeKeywords: santeSnap.exists() ? santeSnap.data()['list'] : DEFAULT_SANTE_KEYWORDS(),
      transactions: txSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction)),
    };
  }

  async saveAccounts(list: Account[]) { await setDoc(this.userDoc('config/accounts'), { list }); }
  async saveCategories(list: Category[]) { await setDoc(this.userDoc('config/categories'), { list }); }
  async saveRevenus(map: Record<string, Revenu>) { await setDoc(this.userDoc('config/revenus'), map); }
  async saveRules(list: CatRule[]) { await setDoc(this.userDoc('config/rules'), { list }); }
  async saveSanteKeywords(list: string[]) { await setDoc(this.userDoc('config/sante'), { list }); }

  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const clean = this.stripUndefined(tx as any);
    const ref = await addDoc(this.txCol(), clean);
    return { id: ref.id, ...tx };
  }

  async updateTransaction(id: string, changes: Partial<Transaction>) {
    await updateDoc(doc(this.firestore, `users/${this.uid}/transactions/${id}`), this.stripUndefined(changes));
  }

  /** Firestore refuses undefined values — strip them before any write */
  private stripUndefined(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  }

  async deleteTransaction(id: string) {
    await deleteDoc(doc(this.firestore, `users/${this.uid}/transactions/${id}`));
  }

  async bulkUpdateTransactions(filter: (t: Transaction) => boolean, changes: Partial<Transaction>) {
    const snap = await getDocs(this.txCol());
    const toUpdate = snap.docs.filter((d: any) => filter({ id: d.id, ...d.data() } as Transaction));
    const clean = this.stripUndefined(changes as any);
    await Promise.all(toUpdate.map((d: any) => updateDoc(d.ref, clean)));
  }

  async importTransactions(txs: Omit<Transaction, 'id'>[], accountId: string, existing: Transaction[]): Promise<Transaction[]> {
    const newTxs = txs.filter(t => !existing.some(e => e.date === t.date && e.label === t.label && Math.abs(e.amount - t.amount) < 0.01));
    const added: Transaction[] = [];
    for (const tx of newTxs) {
      const ref = await addDoc(this.txCol(), this.stripUndefined(tx as any));
      added.push({ id: ref.id, ...tx });
    }
    return added;
  }

  async deleteAccountTransactions(accountId: string) {
    const q = query(this.txCol(), where('accountId', '==', accountId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d: any) => deleteDoc(d.ref)));
  }
}
