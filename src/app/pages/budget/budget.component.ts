import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primeng/accordion';
import { Revenu, Account } from '../../core/models';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, InputNumber, Button, Accordion, AccordionPanel, AccordionHeader, AccordionContent],
  template: `
    <div class="budget-page">
      <h2 class="page-title">💼 Budget & Revenus</h2>

      <!-- Salaires & Contributions -->
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

      <!-- Accordion par compte -->
      <div class="section-card acc-section">
        <h3>🔁 Prélèvements & Budget vs Réel — {{ monthLabel() }}</h3>
        <p-accordion [multiple]="true" [value]="allAccountIds()">
          @for (stat of accountStats(); track stat.account.id) {
            <p-accordion-panel [value]="stat.account.id">
              <p-accordion-header>
                <span class="acc-panel-title">
                  <span class="acc-emoji">{{ stat.account.emoji }}</span>
                  <span class="acc-name">{{ stat.account.label }}</span>
                  @if (stat.recurringTotal > 0) {
                    <span class="acc-badge rec-badge">{{ stat.recurringTotal | currency:'EUR':'symbol':'1.0-0':'fr' }}/mois</span>
                  }
                  @if (stat.totalSpent > 0) {
                    <span class="acc-badge spent-badge">{{ stat.totalSpent | currency:'EUR':'symbol':'1.0-0':'fr' }} dépensé</span>
                  }
                </span>
              </p-accordion-header>
              <p-accordion-content>

                @if (stat.recurring.length === 0 && stat.cats.length === 0) {
                  <div class="empty-panel">Aucune activité ce mois-ci</div>
                }

                <!-- Prélèvements récurrents -->
                @if (stat.recurring.length > 0) {
                  <div class="subsection">
                    <div class="subsection-title">🔁 Prélèvements récurrents</div>
                    <div class="rec-list">
                      @for (r of stat.recurring; track r.label) {
                        <div class="rec-row">
                          <span class="rec-dot" [style.background]="catColor(r.category)"></span>
                          <div class="rec-label">{{ r.label }}</div>
                          <span class="rec-cat" [style.background]="catColor(r.category) + '22'" [style.color]="catColor(r.category)">{{ r.category }}</span>
                          <span class="rec-day">{{ r.day ? 'le ' + r.day : '' }}</span>
                          <span class="rec-amount">{{ r.amount | currency:'EUR':'symbol':'1.2-2':'fr' }}</span>
                        </div>
                      }
                    </div>
                    <div class="rec-summary">
                      <div class="rec-summary-left">
                        <div class="rec-summary-count">{{ stat.recurring.length }} prélèvement{{ stat.recurring.length > 1 ? 's' : '' }}</div>
                        <div class="rec-summary-label">chaque mois</div>
                      </div>
                      <div class="rec-summary-right">
                        <div class="rec-summary-amount">{{ stat.recurringTotal | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
                        <div class="rec-summary-label">/ mois</div>
                      </div>
                    </div>
                  </div>
                }

                <!-- Budget vs Réel -->
                @if (stat.cats.length > 0) {
                  <div class="subsection" [class.first-subsection]="stat.recurring.length === 0">
                    <div class="subsection-title">📊 Budget vs Réel</div>
                    <div class="cat-budget-list">
                      @for (cat of stat.cats; track cat.name) {
                        <div class="cat-row">
                          <div class="cat-dot" [style.background]="cat.color"></div>
                          <div class="cat-name">{{ cat.name }}</div>
                          <div class="cat-budget-bar">
                            <div class="bar-fill" [style.width.%]="cat.pct" [style.background]="cat.color"></div>
                          </div>
                          <div class="cat-amounts">
                            <span class="actual">{{ cat.actual | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
                            @if (cat.budget > 0) {
                              <span class="sep">/</span>
                              <span class="budg">{{ cat.budget | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

              </p-accordion-content>
            </p-accordion-panel>
          }
        </p-accordion>
      </div>
    </div>
  `,
  styles: [`
    .budget-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-title { color: var(--text-primary); font-size: 1.4rem; margin: 0; }
    .section-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.5rem; }
    .acc-section { padding: 1.25rem 1rem; }
    h3 { color: var(--text-primary); margin: 0 0 1.25rem; font-size: 1rem; font-weight: 600; }

    /* Salaires */
    .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .rev-card { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; }
    .rev-header { font-size: 1rem; color: var(--text-primary); margin-bottom: 0.75rem; font-weight: 600; }
    .rev-row { margin-bottom: 0.75rem; }
    label { display: block; color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.25rem; }
    .rev-computed { color: var(--accent-light); font-size: 0.9rem; margin-top: 0.5rem; }
    .total-contrib { color: var(--success); font-size: 1rem; margin-bottom: 0.75rem; }

    /* Accordion panel header */
    .acc-panel-title { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 0; }
    .acc-emoji { font-size: 1.1rem; flex-shrink: 0; }
    .acc-name { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
    .acc-badge { font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 99px; flex-shrink: 0; }
    .rec-badge { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
    .spent-badge { background: rgba(139,92,246,0.12); color: var(--accent-light); border: 1px solid rgba(139,92,246,0.2); }

    /* Sub-sections dans le contenu du panneau */
    .subsection { padding-top: 0.875rem; border-top: 1px solid var(--border-subtle); margin-top: 0.875rem; }
    .first-subsection { border-top: none; margin-top: 0; padding-top: 0; }
    .subsection-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text-muted); margin-bottom: 0.75rem; }

    /* Prélèvements */
    .rec-list { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.875rem; }
    .rec-row { display: grid; grid-template-columns: 10px 1fr auto auto 100px; align-items: center; gap: 0.75rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle); }
    .rec-row:last-child { border-bottom: none; }
    .rec-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .rec-label { color: var(--text-primary); font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rec-cat { font-size: 0.67rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 99px; white-space: nowrap; }
    .rec-day { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; min-width: 44px; text-align: center; }
    .rec-amount { font-size: 0.875rem; font-weight: 600; text-align: right; color: var(--danger); font-variant-numeric: tabular-nums; }
    .rec-summary { display: flex; align-items: center; justify-content: space-between; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.18); border-radius: var(--radius-md); padding: 0.7rem 1rem; }
    .rec-summary-left { display: flex; flex-direction: column; gap: 0.1rem; }
    .rec-summary-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; }
    .rec-summary-count { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
    .rec-summary-amount { font-size: 1.15rem; font-weight: 800; color: var(--danger); font-variant-numeric: tabular-nums; }
    .rec-summary-label { font-size: 0.67rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

    /* Budget vs Réel */
    .cat-budget-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .cat-row { display: grid; grid-template-columns: 10px 140px 1fr 120px; align-items: center; gap: 0.75rem; }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cat-name { color: var(--text-secondary); font-size: 0.875rem; }
    .cat-budget-bar { background: var(--border-default); border-radius: 4px; height: 7px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; max-width: 100%; }
    .cat-amounts { display: flex; gap: 0.25rem; font-size: 0.82rem; justify-content: flex-end; align-items: baseline; }
    .actual { color: var(--text-primary); font-weight: 600; }
    .sep { color: var(--border-strong); }
    .budg { color: var(--text-muted); }

    .empty-panel { color: var(--text-muted); font-size: 0.85rem; padding: 0.25rem 0 0.5rem; text-align: center; }

    @media (max-width: 640px) {
      .acc-section { padding: 1rem 0.75rem; }
      .cat-row { grid-template-columns: 10px 1fr 80px; }
      .cat-budget-bar { display: none; }
      .rev-grid { grid-template-columns: 1fr; }
      .rec-row { grid-template-columns: 10px 1fr 80px; }
      .rec-cat { display: none; }
      .rec-day { display: none; }
      .acc-badge { display: none; }
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

  catColor(name: string) { return this.budget.categories().find(c => c.name === name)?.color ?? '#64748b'; }

  allAccountIds = computed(() => this.budget.accounts().map(a => a.id));

  accountStats = computed(() => {
    type RecRow = { label: string; category: string; amount: number; day: number | null };
    const month = this.budget.selectedMonth();
    const allTxs = this.budget.transactions();
    const monthTxs = this.budget.txForMonth(month);

    return this.budget.accounts().map((acc: Account) => {
      // Recurring deduplicated by label
      const seen = new Map<string, RecRow>();
      for (const tx of allTxs
        .filter(t => t.recurrent && t.amount < 0 && t.accountId === acc.id)
        .sort((a, b) => b.date.localeCompare(a.date))) {
        const key = tx.label.trim().toLowerCase();
        if (!seen.has(key)) {
          const dayStr = tx.date.split('-')[2];
          seen.set(key, { label: tx.label, category: tx.category, amount: tx.amount, day: dayStr ? parseInt(dayStr, 10) : null });
        }
      }
      const recurring = Array.from(seen.values()).sort((a, b) => (a.day ?? 99) - (b.day ?? 99));
      const recurringTotal = recurring.reduce((s, r) => s + Math.abs(r.amount), 0);

      // Category breakdown for this account this month (only categories with spending)
      const accTxs = monthTxs.filter(t => t.amount < 0 && t.accountId === acc.id);
      const cats = this.budget.categories()
        .map(cat => {
          const actual = accTxs.filter(t => t.category === cat.name).reduce((s, t) => s + Math.abs(t.amount), 0);
          const pct = cat.budget > 0 ? Math.min(100, (actual / cat.budget) * 100) : 0;
          return { name: cat.name, color: cat.color, budget: cat.budget, actual, pct };
        })
        .filter(c => c.actual > 0);

      const totalSpent = cats.reduce((s, c) => s + c.actual, 0);
      return { account: acc, recurring, recurringTotal, cats, totalSpent };
    });
  });

  async save() {
    for (const id of Object.keys(this.editRevenus))
      await this.budget.updateRevenu(id, this.editRevenus[id] as Revenu);
  }
}
