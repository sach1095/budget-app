import { Component, inject, computed, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <div class="stats">
      <div class="page-header">
        <h2 class="page-title">📊 Vue globale</h2>
        <div class="period-label">{{ monthLabel() }}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Dépenses</div>
          <div class="kpi-value expense">{{ totalExpenses() | currency:'EUR':'symbol':'1.0-0':'fr' }}</div>
          <div class="kpi-sub">{{ txCount() }} transactions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Revenus</div>
          <div class="kpi-value income">{{ totalIncome() | currency:'EUR':'symbol':'1.0-0':'fr' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Solde net</div>
          <div class="kpi-value" [class.income]="balance() >= 0" [class.expense]="balance() < 0">
            {{ balance() | currency:'EUR':'symbol':'1.0-0':'fr' }}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Budget utilisé</div>
          <div class="kpi-value neutral">{{ budgetUsedPct() | number:'1.0-0' }}%</div>
          <div class="budget-bar"><div class="budget-fill" [style.width.%]="budgetUsedPct()" [class.over]="budgetUsedPct() > 100"></div></div>
        </div>
      </div>

      <div class="charts-row">
        <div class="section-card chart-card">
          <div class="section-title">Répartition des dépenses</div>
          <div class="donut-wrap"><canvas #donut></canvas></div>
        </div>
        <div class="section-card chart-card">
          <div class="section-title">Par compte</div>
          <canvas #bar></canvas>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">Budget vs Réel par catégorie</div>
        <canvas #budgetBar></canvas>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: flex; flex-direction: column; gap: 1.5rem; }
    .period-label { font-size: 0.85rem; color: var(--text-muted); text-transform: capitalize; font-weight: 500; }
    .kpi-sub { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem; }
    .budget-bar { height: 4px; background: var(--border-default); border-radius: 2px; margin-top: 0.5rem; overflow: hidden; }
    .budget-fill { height: 100%; background: var(--accent-grad); border-radius: 2px; transition: width 0.5s; }
    .budget-fill.over { background: linear-gradient(90deg, var(--warning), var(--danger)); }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .chart-card canvas { max-height: 240px; }
    .donut-wrap { display: flex; justify-content: center; }
    .donut-wrap canvas { max-height: 220px; max-width: 220px; }
    @media (max-width: 700px) { .charts-row { grid-template-columns: 1fr; } }
  `]
})
export class StatsComponent implements AfterViewInit, OnDestroy {
  budget = inject(BudgetService);
  @ViewChild('donut') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bar') barRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('budgetBar') budgetBarRef!: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];

  monthLabel() {
    const [y, m] = this.budget.selectedMonth().split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  totalExpenses = computed(() => this.budget.txForMonth(this.budget.selectedMonth()).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0));
  totalIncome = computed(() => this.budget.txForMonth(this.budget.selectedMonth()).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0));
  balance = computed(() => this.totalIncome() - this.totalExpenses());
  txCount = computed(() => this.budget.txForMonth(this.budget.selectedMonth()).length);
  budgetUsedPct = computed(() => {
    const totalBudget = this.budget.categories().reduce((s, c) => s + c.budget, 0);
    return totalBudget > 0 ? (this.totalExpenses() / totalBudget) * 100 : 0;
  });

  ngAfterViewInit() { this.buildCharts(); }
  ngOnDestroy() { this.charts.forEach(c => c.destroy()); }

  private chartDefaults = {
    scales: {
      x: { ticks: { color: '#475569', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } },
      y: { ticks: { color: '#475569', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } }
    },
    plugins: { legend: { display: false } }
  };

  buildCharts() {
    this.charts.forEach(c => c.destroy()); this.charts = [];
    const month = this.budget.selectedMonth();
    const txs = this.budget.txForMonth(month).filter(t => t.amount < 0);
    const cats = this.budget.totalByCategory(txs);
    const catList = this.budget.categories();
    const catNames = Object.keys(cats);
    const catColors = catNames.map(n => catList.find(c => c.name === n)?.color ?? '#64748b');

    // Donut
    this.charts.push(new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: { labels: catNames, datasets: [{ data: Object.values(cats), backgroundColor: catColors, borderColor: 'rgba(6,8,15,0)', borderWidth: 3, hoverOffset: 4 }] },
      options: {
        cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, boxHeight: 10, padding: 12, font: { family: 'Inter', size: 11 } } } },
        maintainAspectRatio: true
      }
    }));

    // Bar by account
    const accs = this.budget.accounts();
    const accData = accs.map(a => this.budget.txForAccount(a.id, month).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0));
    this.charts.push(new Chart(this.barRef.nativeElement, {
      type: 'bar',
      data: { labels: accs.map(a => `${a.emoji} ${a.label}`), datasets: [{ data: accData, backgroundColor: 'rgba(139,92,246,0.7)', borderRadius: 6, borderSkipped: false }] },
      options: { ...this.chartDefaults, plugins: { legend: { display: false } } }
    }));

    // Budget vs actual
    const labels = catList.map(c => c.name);
    this.charts.push(new Chart(this.budgetBarRef.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Budget', data: catList.map(c => c.budget), backgroundColor: 'rgba(139,92,246,0.25)', borderColor: 'rgba(139,92,246,0.6)', borderWidth: 1, borderRadius: 4 },
        { label: 'Réel', data: catList.map(c => cats[c.name] ?? 0), backgroundColor: catList.map(c => (cats[c.name] ?? 0) > c.budget ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.65)'), borderRadius: 4 }
      ]},
      options: { ...this.chartDefaults, plugins: { legend: { display: true, labels: { color: '#94a3b8', boxWidth: 10, font: { family: 'Inter', size: 11 } } } } }
    }));
  }
}
