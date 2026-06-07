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
