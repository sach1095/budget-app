export interface Account {
  id: string;
  label: string;
  emoji: string;
  type: 'commun' | 'person';
  deletable: boolean;
}

export interface Category {
  name: string;
  color: string;
  budget: number;
}

export interface Transaction {
  id: string;
  date: string;
  label: string;
  amount: number;
  category: string;
  accountId: string;
  month: string;        // YYYY-MM — mois de la date réelle
  budgetMonth?: string; // YYYY-MM — override : mois comptabilisé (ex: virement fin de mois → mois suivant)
  contribFrom?: string; // accountId de la personne (virements entrants sur commun)
}

export interface Revenu {
  salaire: number;
  pct: number;
}

export interface CatRule {
  keywords: string[]; // mots-clés en MAJUSCULES
  category: string;
}

export interface BudgetData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  revenus: { [accountId: string]: Revenu };
}
