import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { TxListComponent } from '../../shared/components/tx-list/tx-list.component';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, TxListComponent, Button, Dialog, InputText, ConfirmDialog],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />
    @if (account()) {
      <div class="account-page">
        <div class="account-header">
          <div class="account-title">
            <span class="acc-emoji">{{ account()!.emoji }}</span>
            <h2>{{ account()!.label }}</h2>
          </div>
          <div class="account-actions">
            <p-button icon="pi pi-pencil" label="Modifier" [outlined]="true" size="small" (onClick)="openEdit()" />
            @if (account()!.deletable) {
              <p-button icon="pi pi-trash" severity="danger" [outlined]="true" size="small" (onClick)="confirmDelete()" />
            }
          </div>
        </div>
        <div class="kpi-row">
          <div class="kpi-card kpi-salary">
            <div class="kpi-label">💰 Salaire</div>
            <div class="kpi-value salary">{{ salary() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
            @if (otherIncome() > 0) {
              <div class="kpi-sub">+ {{ otherIncome() | currency:'EUR':'symbol':'1.0-0':'fr' }} autres</div>
            }
          </div>
          <div class="kpi-card kpi-savings">
            <div class="kpi-label">🏦 Épargne</div>
            <div class="kpi-value savings">{{ savings() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">📉 Dépenses</div>
            <div class="kpi-value expense">{{ expenses() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">⚖️ Solde</div>
            <div class="kpi-value" [class.income]="balance() >= 0" [class.expense]="balance() < 0">{{ balance() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
          </div>
        </div>
        <div class="section-card">
          <h3>Transactions — {{ monthLabel() }}</h3>
          <app-tx-list [accountId]="accountId()" />
        </div>
      </div>
    } @else {
      <div class="not-found">Compte introuvable.</div>
    }

    <p-dialog header="Modifier le compte" [(visible)]="showEdit" [modal]="true" [style]="{width:'380px'}">
      <div class="form-group"><label>Nom</label><input pInputText [(ngModel)]="editLabel" class="w-full" /></div>
      <div class="form-group">
        <label>Emoji</label>
        <div class="emoji-grid">
          @for (e of emojis; track e) {
            <span class="emoji-opt" [class.selected]="editEmoji === e" (click)="editEmoji = e">{{ e }}</span>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showEdit = false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="saveEdit()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .account-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .account-header { display: flex; justify-content: space-between; align-items: center; }
    .account-title { display: flex; align-items: center; gap: 0.75rem; }
    .acc-emoji { font-size: 2rem; }
    h2 { color: #e2e8f0; margin: 0; font-size: 1.4rem; }
    .account-actions { display: flex; gap: 0.5rem; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
    .kpi-card { background: #1a1d2e; border: 1px solid #2a2d3e; border-radius: 12px; padding: 1.25rem; }
    .kpi-salary { border-color: rgba(251,191,36,0.25); }
    .kpi-savings { border-color: rgba(96,165,250,0.25); }
    .kpi-label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.4rem; letter-spacing: 0.04em; }
    .kpi-value { font-size: 1.4rem; font-weight: 700; }
    .kpi-sub { font-size: 0.7rem; color: #475569; margin-top: 0.25rem; }
    .salary { color: #fbbf24; }
    .savings { color: #60a5fa; }
    .income { color: #4CAF50; } .expense { color: #f44336; }
    .section-card { background: #1a1d2e; border: 1px solid #2a2d3e; border-radius: 12px; padding: 1.5rem; }
    h3 { color: #e2e8f0; margin: 0 0 1rem; }
    .not-found { color: #64748b; padding: 2rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    label { color: #94a3b8; font-size: 0.875rem; }
    .emoji-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .emoji-opt { font-size: 1.5rem; cursor: pointer; padding: 0.25rem; border-radius: 6px; border: 2px solid transparent; }
    .emoji-opt:hover, .emoji-opt.selected { border-color: #7c6af7; background: #252840; }

    @media (max-width: 640px) {
      .account-page { gap: 1rem; }
      .account-header { flex-wrap: wrap; gap: 0.75rem; }
      .account-title h2 { font-size: 1.1rem; }
      .acc-emoji { font-size: 1.6rem; }
      .kpi-row { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      .kpi-card { padding: 0.875rem; }
      .kpi-value { font-size: 1.1rem; }
      .section-card { padding: 1rem; }
    }
  `]
})
export class AccountComponent implements OnInit {
  budget = inject(BudgetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirm = inject(ConfirmationService);

  showEdit = false;
  editLabel = '';
  editEmoji = '👤';
  emojis = ['👤','👨','👩','🧑','👦','👧','🧔','👴','👵','🧒','🐱','🐶','🌟','🔥','💎','🎯','🏆','🎪','🦊','🐺'];

  accountId = signal('');
  account = computed(() => this.budget.accounts().find(a => a.id === this.accountId()));

  ngOnInit() {
    this.route.paramMap.subscribe(p => this.accountId.set(p.get('id') ?? ''));
  }

  monthLabel() {
    const [y, m] = this.budget.selectedMonth().split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  private monthTxs = computed(() => this.budget.txForAccount(this.accountId(), this.budget.selectedMonth()));
  expenses = computed(() => this.monthTxs().filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0));
  salary = computed(() => this.monthTxs().filter(t => t.contribFrom === '__salaire__').reduce((s, t) => s + t.amount, 0));
  savings = computed(() => this.monthTxs().filter(t => t.contribFrom === '__epargne__').reduce((s, t) => s + t.amount, 0));
  otherIncome = computed(() => this.monthTxs().filter(t => t.amount > 0 && !t.contribFrom).reduce((s, t) => s + t.amount, 0));
  income = computed(() => this.salary() + this.otherIncome()); // hors épargne
  balance = computed(() => this.income() - this.expenses());

  openEdit() {
    const acc = this.account();
    if (!acc) return;
    this.editLabel = acc.label; this.editEmoji = acc.emoji; this.showEdit = true;
  }

  async saveEdit() {
    await this.budget.updateAccount(this.accountId(), { label: this.editLabel, emoji: this.editEmoji });
    this.showEdit = false;
  }

  confirmDelete() {
    this.confirm.confirm({
      message: `Supprimer "${this.account()?.label}" et toutes ses transactions ?`,
      header: 'Confirmer', icon: 'pi pi-trash',
      accept: async () => { await this.budget.deleteAccount(this.accountId()); this.router.navigate(['/dashboard/stats']); }
    });
  }
}
