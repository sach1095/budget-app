import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Revenu } from '../../core/models';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, InputNumber, Button],
  template: `
    <div class="budget-page">
      <h2 class="page-title">💼 Budget & Revenus</h2>
      <div class="section-card">
        <h3>Salaires & Contributions</h3>
        <div class="rev-grid">
          @for (acc of personAccounts(); track acc.id) {
            @if (editRevenus[acc.id]) {
              <div class="rev-card">
                <div class="rev-header">{{ acc.emoji }} {{ acc.label }}</div>
                <div class="rev-row">
                  <label>Salaire net (€)</label>
                  <p-inputNumber [(ngModel)]="editRevenus[acc.id].salaire" [minFractionDigits]="0" [maxFractionDigits]="0" styleClass="w-full" />
                </div>
                <div class="rev-row">
                  <label>Contribution compte commun (%)</label>
                  <p-inputNumber [(ngModel)]="editRevenus[acc.id].pct" [min]="0" [max]="100" suffix="%" styleClass="w-full" />
                </div>
                <div class="rev-computed">Verse <strong>{{ contribution(acc.id) | currency:'EUR':'symbol':'1.0-0':'fr' }}</strong>/mois</div>
              </div>
            }
          }
        </div>
        <div class="total-contrib">Budget commun total : <strong>{{ totalContrib | currency:'EUR':'symbol':'1.0-0':'fr' }}</strong>/mois</div>
        <p-button label="Enregistrer" icon="pi pi-save" (onClick)="save()" />
      </div>

      @if (recurringTxs().length > 0) {
        <div class="section-card">
          <h3>🔁 Prélèvements récurrents</h3>
          <div class="rec-list">
            @for (r of recurringTxs(); track r.label) {
              <div class="rec-row">
                <span class="rec-dot" [style.background]="catColor(r.category)"></span>
                <div class="rec-label">{{ r.label }}</div>
                <span class="rec-cat" [style.background]="catColor(r.category) + '22'" [style.color]="catColor(r.category)">{{ r.category }}</span>
                <span class="rec-day" title="Jour habituel du prélèvement">{{ r.day ? 'le ' + r.day : '' }}</span>
                <span class="rec-amount">{{ r.amount | currency:'EUR':'symbol':'1.2-2':'fr' }}</span>
              </div>
            }
          </div>
          <div class="rec-summary">
            <div class="rec-summary-left">
              <div class="rec-summary-count">{{ recurringTxs().length }} prélèvement{{ recurringTxs().length > 1 ? 's' : '' }}</div>
              <div class="rec-summary-label">chaque mois</div>
            </div>
            <div class="rec-summary-right">
              <div class="rec-summary-amount">{{ recurringTotal() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
              <div class="rec-summary-label">/ mois</div>
            </div>
          </div>
        </div>
      }

      <div class="section-card">
        <h3>Budget vs Réel — {{ monthLabel() }}</h3>
        <div class="cat-budget-list">
          @for (cat of budget.categories(); track cat.name) {
            <div class="cat-row">
              <div class="cat-dot" [style.background]="cat.color"></div>
              <div class="cat-name">{{ cat.name }}</div>
              <div class="cat-budget-bar">
                <div class="bar-fill" [style.width.%]="barPct(cat.name)" [style.background]="cat.color"></div>
              </div>
              <div class="cat-amounts">
                <span class="actual">{{ actual(cat.name) | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
                <span class="sep">/</span>
                <span class="budg">{{ cat.budget | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .budget-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-title { color: #e2e8f0; font-size: 1.4rem; margin: 0; }
    .section-card { background: #1a1d2e; border: 1px solid #2a2d3e; border-radius: 12px; padding: 1.5rem; }
    h3 { color: #e2e8f0; margin: 0 0 1.25rem; font-size: 1rem; }
    .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .rev-card { background: #252840; border-radius: 10px; padding: 1rem; }
    .rev-header { font-size: 1rem; color: #e2e8f0; margin-bottom: 0.75rem; font-weight: 600; }
    .rev-row { margin-bottom: 0.75rem; }
    label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 0.25rem; }
    .rev-computed { color: #7c6af7; font-size: 0.9rem; margin-top: 0.5rem; }
    .total-contrib { color: #4CAF50; font-size: 1rem; margin-bottom: 0.75rem; }
    .cat-budget-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .cat-row { display: grid; grid-template-columns: 12px 140px 1fr 130px; align-items: center; gap: 0.75rem; }
    .cat-dot { width: 12px; height: 12px; border-radius: 50%; }
    .cat-name { color: #e2e8f0; font-size: 0.875rem; }
    .cat-budget-bar { background: #2a2d3e; border-radius: 4px; height: 8px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; max-width: 100%; }
    .cat-amounts { display: flex; gap: 0.25rem; font-size: 0.85rem; justify-content: flex-end; }
    .actual { color: #e2e8f0; font-weight: 600; } .sep { color: #4a5568; } .budg { color: #64748b; }

    .rec-list { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
    .rec-row { display: grid; grid-template-columns: 10px 1fr auto auto 110px; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #2a2d3e; }
    .rec-row:last-child { border-bottom: none; }
    .rec-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .rec-label { color: #e2e8f0; font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rec-cat { font-size: 0.68rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 99px; white-space: nowrap; }
    .rec-day { font-size: 0.75rem; color: #64748b; white-space: nowrap; min-width: 48px; text-align: center; }
    .rec-amount { font-size: 0.875rem; font-weight: 600; text-align: right; color: #ef4444; font-variant-numeric: tabular-nums; }
    .rec-summary {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
      border-radius: 10px; padding: 0.875rem 1.25rem; margin-top: 0.25rem;
    }
    .rec-summary-left { display: flex; flex-direction: column; gap: 0.1rem; }
    .rec-summary-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; }
    .rec-summary-count { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; }
    .rec-summary-amount { font-size: 1.35rem; font-weight: 800; color: #ef4444; font-variant-numeric: tabular-nums; }
    .rec-summary-label { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

    @media (max-width: 640px) {
      .cat-row { grid-template-columns: 12px 1fr 110px; }
      .cat-budget-bar { display: none; }
      .rev-grid { grid-template-columns: 1fr; }
      .rec-row { grid-template-columns: 10px 1fr 80px; }
      .rec-cat { display: none; }
      .rec-day { display: none; }
    }
  `]
})
export class BudgetComponent {
  budget = inject(BudgetService);
  editRevenus: { [id: string]: { salaire: number; pct: number } } = {};
  personAccounts = computed(() => this.budget.accounts().filter(a => a.type === 'person'));
  
  get totalContrib(): number {
    return this.personAccounts().reduce((s, a) => s + this.contribution(a.id), 0);
  }

  constructor() { this.syncRevenus(); }

  syncRevenus() {
    const rev = this.budget.revenus();
    this.editRevenus = {};
    for (const id of Object.keys(rev)) this.editRevenus[id] = { ...rev[id] };
    // Ensure all person accounts have an entry
    for (const acc of this.budget.accounts().filter(a => a.type === 'person')) {
      if (!this.editRevenus[acc.id]) this.editRevenus[acc.id] = { salaire: 0, pct: 0 };
    }
  }

  monthLabel() {
    const [y, m] = this.budget.selectedMonth().split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  contribution(id: string): number {
    const r = this.editRevenus[id];
    return r ? r.salaire * (r.pct / 100) : 0;
  }

  actual(catName: string): number {
    return this.budget.txForMonth(this.budget.selectedMonth())
      .filter(t => t.amount < 0 && t.category === catName)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }

  catColor(name: string) { return this.budget.categories().find(c => c.name === name)?.color ?? '#64748b'; }

  /** Tous les prélèvements marqués récurrents, dédupliqués par label (dernier montant connu) */
  recurringTxs = computed(() => {
    const seen = new Map<string, { label: string; category: string; amount: number; day: number | null }>();
    const allTxs = this.budget.transactions()
      .filter(t => t.recurrent && t.amount < 0)
      .sort((a, b) => b.date.localeCompare(a.date)); // plus récent en premier

    for (const tx of allTxs) {
      const key = tx.label.trim().toLowerCase();
      if (!seen.has(key)) {
        const dayStr = tx.date.split('-')[2];
        seen.set(key, {
          label: tx.label,
          category: tx.category,
          amount: tx.amount,
          day: dayStr ? parseInt(dayStr, 10) : null,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => (a.day ?? 99) - (b.day ?? 99));
  });

  recurringTotal = computed(() =>
    this.recurringTxs().reduce((s, r) => s + Math.abs(r.amount), 0)
  );

  barPct(catName: string): number {
    const cat = this.budget.categories().find(c => c.name === catName);
    if (!cat || cat.budget === 0) return 0;
    return Math.min(100, (this.actual(catName) / cat.budget) * 100);
  }

  async save() {
    for (const id of Object.keys(this.editRevenus))
      await this.budget.updateRevenu(id, this.editRevenus[id] as Revenu);
  }
}
