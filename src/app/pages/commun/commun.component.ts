import { Component, inject, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { TxListComponent } from '../../shared/components/tx-list/tx-list.component';
import { Transaction } from '../../core/models';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-commun',
  standalone: true,
  imports: [CurrencyPipe, TxListComponent, Dialog, Toast],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" />
    <div class="commun-page">
      <h2 class="page-title">🏦 Compte Commun — {{ monthLabel() }}</h2>

      <!-- KPI globaux -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Dépenses réelles</div>
          <div class="kpi-value expense">{{ expenses() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Contributions reçues</div>
          <div class="kpi-value income">{{ totalReceived() | currency:'EUR':'symbol':'1.2-2':'fr' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Solde du mois</div>
          <div class="kpi-value" [class.income]="solde() >= 0" [class.expense]="solde() < 0">
            {{ solde() | currency:'EUR':'symbol':'1.2-2':'fr' }}
          </div>
        </div>
      </div>

      <!-- Contributions : budgété vs reçu -->
      <div class="section-card">
        <h3>Contributions ce mois</h3>
        <div class="contrib-list">
          @for (acc of personAccounts(); track acc.id) {
            @let budgeted = budgetedContrib(acc.id);
            @let received = receivedContrib(acc.id);
            @let diff = received - budgeted;
            <div class="contrib-row">
              <div class="contrib-info">
                <span class="contrib-emoji">{{ acc.emoji }}</span>
                <span class="contrib-name">{{ acc.label }}</span>
              </div>
              <div class="contrib-bar-wrap">
                <div class="contrib-bar" [style.width.%]="barPct(received, budgeted)"
                  [class.over]="received >= budgeted" [class.under]="received < budgeted"></div>
              </div>
              <div class="contrib-amounts">
                <span class="contrib-received" [class.over]="received >= budgeted" [class.under]="received < budgeted && received > 0">
                  {{ received | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </span>
                <span class="contrib-sep">/</span>
                <span class="contrib-budgeted">{{ budgeted | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
              </div>
              <div class="contrib-diff" [class.positive]="diff >= 0" [class.negative]="diff < 0">
                @if (received === 0) {
                  <span class="badge-pending">En attente</span>
                } @else if (diff >= 0) {
                  <span class="badge-ok">+{{ diff | currency:'EUR':'symbol':'1.0-0':'fr' }} ✓</span>
                } @else {
                  <span class="badge-short">{{ diff | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
                }
              </div>
            </div>
          }
        </div>

        @if (epargneContribs() > 0) {
          <div class="extra-row epargne-row">
            <div class="contrib-info">
              <span class="contrib-emoji">🏦</span>
              <span class="contrib-name">Depuis épargne</span>
            </div>
            <div class="contrib-bar-wrap">
              <div class="contrib-bar over" style="width:100%"></div>
            </div>
            <div class="contrib-amounts">
              <span class="contrib-received over">{{ epargneContribs() | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
            </div>
            <div class="contrib-diff">
              <span class="badge-ok">Ponctuel</span>
            </div>
          </div>
        }

        @if (remboursementContribs() > 0) {
          <div class="extra-row sante-row">
            <div class="contrib-info">
              <span class="contrib-emoji">🏥</span>
              <span class="contrib-name">Remboursement santé</span>
            </div>
            <div class="contrib-bar-wrap">
              <div class="contrib-bar sante" style="width:100%"></div>
            </div>
            <div class="contrib-amounts">
              <span class="contrib-received sante">{{ remboursementContribs() | currency:'EUR':'symbol':'1.0-0':'fr' }}</span>
            </div>
            <div class="contrib-diff">
              <span class="badge-sante">Remboursé</span>
            </div>
          </div>
        }

        @if (unassignedContribs() > 0) {
          <button class="unassigned-warn" (click)="openUnassigned()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>{{ unassignedContribs() | currency:'EUR':'symbol':'1.0-0':'fr' }} de virements non attribués</span>
            <span class="unassigned-cta">Cliquez pour attribuer →</span>
          </button>
        }
      </div>

      <!-- Dépenses par catégorie -->
      <div class="section-card">
        <h3>Dépenses par catégorie</h3>
        <div class="cat-list">
          @for (cat of catBreakdown(); track cat.name) {
            <div class="cat-row">
              <div class="cat-dot" [style.background]="cat.color"></div>
              <div class="cat-name">{{ cat.name }}</div>
              <div class="cat-bar-wrap">
                <div class="cat-bar" [style.width.%]="cat.pct" [style.background]="cat.color"></div>
              </div>
              <div class="cat-amt">{{ cat.amount | currency:'EUR':'symbol':'1.0-0':'fr' }}</div>
            </div>
          }
        </div>
      </div>

      <div class="section-card">
        <h3>Transactions</h3>
        <app-tx-list accountId="commun" />
      </div>
    </div>

    <!-- Dialog virements non attribués -->
    <p-dialog header="Virements non attribués" [(visible)]="showUnassigned"
      [modal]="true" [style]="{width:'540px'}" (onHide)="pendingAttribs.set({})">
      <p class="dlg-subtitle">Attribuez chaque virement à une personne ou une source pour le comptabiliser correctement.</p>

      <div class="unassigned-list">
        @for (tx of unassignedTxsList(); track tx.id) {
          <div class="ua-row" [class.attributed]="!!pendingAttribs()[tx.id]">
            <div class="ua-meta">
              <span class="ua-date">{{ tx.date }}</span>
              <span class="ua-label">{{ tx.label }}</span>
              <span class="ua-amount">+{{ tx.amount | currency:'EUR':'symbol':'1.2-2':'fr' }}</span>
            </div>
            <div class="ua-btns">
              @for (acc of personAccounts(); track acc.id) {
                <button class="ua-btn" [class.active]="pendingAttribs()[tx.id] === acc.id"
                  (click)="setAttrib(tx.id, acc.id)">
                  {{ acc.emoji }} {{ acc.label }}
                </button>
              }
              <button class="ua-btn epargne" [class.active]="pendingAttribs()[tx.id] === '__epargne__'"
                (click)="setAttrib(tx.id, '__epargne__')">🏦 Épargne</button>
              <button class="ua-btn sante" [class.active]="pendingAttribs()[tx.id] === '__remboursement_sante__'"
                (click)="setAttrib(tx.id, '__remboursement_sante__')">🏥 Santé</button>
            </div>
          </div>
        }
      </div>

      <div class="dlg-footer">
        <button class="dlg-btn" (click)="showUnassigned = false">Annuler</button>
        <button class="dlg-btn primary" [disabled]="pendingCount() === 0" (click)="saveAttribs()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Enregistrer ({{ pendingCount() }})
        </button>
      </div>
    </p-dialog>
  `,
  styles: [`
    .commun-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-title { color: var(--text-primary); font-size: 1.4rem; margin: 0; font-weight: 700; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
    .kpi-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; }
    .kpi-label { color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; }
    .income { color: var(--success); } .expense { color: var(--danger); }
    .section-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.5rem; }
    h3 { color: var(--text-primary); margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }

    /* Contributions */
    .contrib-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .contrib-row { display: grid; grid-template-columns: 160px 1fr 120px 110px; gap: 1rem; align-items: center; padding: 0.75rem; background: var(--bg-elevated); border-radius: var(--radius-md); }
    .contrib-info { display: flex; align-items: center; gap: 0.5rem; }
    .contrib-emoji { font-size: 1.25rem; }
    .contrib-name { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
    .contrib-bar-wrap { background: var(--border-default); border-radius: 4px; height: 8px; overflow: hidden; }
    .contrib-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; max-width: 100%; }
    .contrib-bar.over { background: var(--success); }
    .contrib-bar.under { background: var(--warning); }
    .contrib-bar.sante { background: #2dd4bf; }
    .contrib-amounts { display: flex; align-items: baseline; gap: 0.25rem; font-size: 0.875rem; }
    .contrib-received { font-weight: 700; }
    .contrib-received.over { color: var(--success); }
    .contrib-received.under { color: var(--warning); }
    .contrib-received.sante { color: #2dd4bf; }
    .contrib-sep { color: var(--text-muted); }
    .contrib-budgeted { color: var(--text-muted); font-size: 0.8rem; }
    .contrib-diff { display: flex; align-items: center; justify-content: flex-end; }
    .badge-ok { font-size: 0.75rem; font-weight: 700; color: var(--success); background: rgba(16,185,129,0.1); padding: 0.2rem 0.5rem; border-radius: 6px; }
    .badge-short { font-size: 0.75rem; font-weight: 700; color: var(--danger); background: rgba(239,68,68,0.1); padding: 0.2rem 0.5rem; border-radius: 6px; }
    .badge-pending { font-size: 0.75rem; color: var(--text-muted); background: var(--bg-hover); padding: 0.2rem 0.5rem; border-radius: 6px; }
    .badge-sante { font-size: 0.75rem; font-weight: 700; color: #2dd4bf; background: rgba(45,212,191,0.1); padding: 0.2rem 0.5rem; border-radius: 6px; }

    /* Extra rows (épargne, santé) */
    .extra-row { display: grid; grid-template-columns: 160px 1fr 120px 110px; gap: 1rem; align-items: center; padding: 0.75rem; border-radius: var(--radius-md); margin-top: 0.5rem; }
    .epargne-row { background: rgba(96,165,250,0.06); border: 1px solid rgba(96,165,250,0.15); }
    .sante-row { background: rgba(45,212,191,0.05); border: 1px solid rgba(45,212,191,0.2); }

    /* Warning banner */
    .unassigned-warn {
      margin-top: 0.75rem; display: flex; align-items: center; gap: 0.6rem;
      font-size: 0.8rem; color: var(--warning); background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.25); border-radius: var(--radius-md);
      padding: 0.6rem 0.875rem; cursor: pointer; font-family: inherit; width: 100%;
      text-align: left; transition: background 0.15s;
    }
    .unassigned-warn:hover { background: rgba(245,158,11,0.14); }
    .unassigned-cta { margin-left: auto; font-weight: 600; font-size: 0.78rem; white-space: nowrap; }

    /* Categories */
    .cat-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .cat-row { display: grid; grid-template-columns: 12px 130px 1fr 80px; gap: 0.75rem; align-items: center; }
    .cat-dot { width: 12px; height: 12px; border-radius: 50%; }
    .cat-name { color: var(--text-primary); font-size: 0.875rem; }
    .cat-bar-wrap { background: var(--border-default); border-radius: 4px; height: 8px; overflow: hidden; }
    .cat-bar { height: 100%; border-radius: 4px; max-width: 100%; }
    .cat-amt { color: var(--text-primary); font-size: 0.85rem; font-weight: 600; text-align: right; }

    /* Unassigned dialog */
    .dlg-subtitle { color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1.25rem; }
    .unassigned-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 380px; overflow-y: auto; padding-right: 4px; }
    .ua-row {
      padding: 0.875rem; border-radius: var(--radius-md);
      background: var(--bg-elevated); border: 1.5px solid var(--border-default); transition: border-color 0.2s;
    }
    .ua-row.attributed { border-color: rgba(34,197,94,0.35); background: rgba(34,197,94,0.04); }
    .ua-meta { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.625rem; }
    .ua-date { font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums; min-width: 70px; }
    .ua-label { flex: 1; font-size: 0.85rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ua-amount { font-size: 0.9rem; font-weight: 700; color: var(--success); flex-shrink: 0; }
    .ua-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .ua-btn {
      padding: 0.35rem 0.7rem; font-size: 0.8rem; border-radius: var(--radius-md);
      border: 1.5px solid var(--border-default); background: var(--bg-card);
      color: var(--text-secondary); cursor: pointer; font-family: inherit; transition: var(--transition);
    }
    .ua-btn:hover { border-color: rgba(34,197,94,0.4); color: var(--text-primary); }
    .ua-btn.active { border-color: #4ade80; background: rgba(34,197,94,0.1); color: #4ade80; font-weight: 600; }
    .ua-btn.epargne.active { border-color: #60a5fa; background: rgba(96,165,250,0.1); color: #60a5fa; }
    .ua-btn.sante.active { border-color: #2dd4bf; background: rgba(45,212,191,0.1); color: #2dd4bf; }
    .dlg-footer { display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle); margin-top: 1.25rem; }
    .dlg-btn {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.45rem 0.875rem; border-radius: var(--radius-md);
      border: 1px solid var(--border-default); background: var(--bg-elevated);
      color: var(--text-secondary); font-size: 0.82rem; font-weight: 500;
      cursor: pointer; font-family: inherit; transition: var(--transition);
    }
    .dlg-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .dlg-btn.primary { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); color: var(--accent-light); }
    .dlg-btn.primary:hover { background: rgba(139,92,246,0.25); }
    .dlg-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class CommunComponent {
  budget = inject(BudgetService);
  private msg = inject(MessageService);

  personAccounts = computed(() => this.budget.accounts().filter(a => a.type === 'person'));

  showUnassigned = false;
  pendingAttribs = signal<Record<string, string | undefined>>({});

  monthLabel() {
    const [y, m] = this.budget.selectedMonth().split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  private monthTxs = computed(() =>
    this.budget.txForAccount('commun', this.budget.selectedMonth())
  );

  // Dépenses = montants négatifs uniquement (les contribs positives sont exclues)
  expenses = computed(() =>
    this.monthTxs().filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  );

  // Total contributions réellement reçues et attribuées ce mois
  totalReceived = computed(() =>
    this.monthTxs().filter(t => this.budget.isContrib(t)).reduce((s, t) => s + t.amount, 0)
  );

  // Depuis épargne
  epargneContribs = computed(() =>
    this.monthTxs()
      .filter(t => this.budget.isContrib(t) && t.contribFrom === '__epargne__')
      .reduce((s, t) => s + t.amount, 0)
  );

  // Remboursements santé
  remboursementContribs = computed(() =>
    this.monthTxs()
      .filter(t => this.budget.isContrib(t) && t.contribFrom === '__remboursement_sante__')
      .reduce((s, t) => s + t.amount, 0)
  );

  // Virements positifs non attribués (aucun contribFrom)
  unassignedContribs = computed(() =>
    this.monthTxs()
      .filter(t => t.amount > 0 && !this.budget.isContrib(t))
      .reduce((s, t) => s + t.amount, 0)
  );

  // Liste des transactions non attribuées (pour le dialog)
  unassignedTxsList = computed(() =>
    this.monthTxs()
      .filter(t => t.amount > 0 && !this.budget.isContrib(t))
      .sort((a, b) => b.date.localeCompare(a.date))
  );

  pendingCount = computed(() =>
    Object.values(this.pendingAttribs()).filter(v => v !== undefined).length
  );

  solde = computed(() => this.totalReceived() - this.expenses());

  // Contribution budgétée pour une personne (salaire × %)
  budgetedContrib(id: string): number {
    const rev = this.budget.revenus()[id];
    return rev ? rev.salaire * rev.pct / 100 : 0;
  }

  // Contribution réellement reçue ce mois de cette personne
  receivedContrib(id: string): number {
    return this.monthTxs()
      .filter(t => this.budget.isContrib(t) && t.contribFrom === id)
      .reduce((s, t) => s + t.amount, 0);
  }

  barPct(received: number, budgeted: number): number {
    if (budgeted === 0) return received > 0 ? 100 : 0;
    return Math.min(100, (received / budgeted) * 100);
  }

  catBreakdown = computed(() => {
    const txs = this.monthTxs().filter(t => t.amount < 0);
    const totals = this.budget.totalByCategory(txs);
    const maxVal = Math.max(...Object.values(totals), 1);
    return this.budget.categories()
      .filter(c => (totals[c.name] ?? 0) > 0)
      .map(c => ({ name: c.name, color: c.color, amount: totals[c.name] ?? 0, pct: ((totals[c.name] ?? 0) / maxVal) * 100 }))
      .sort((a, b) => b.amount - a.amount);
  });

  openUnassigned() {
    this.pendingAttribs.set({});
    this.showUnassigned = true;
  }

  setAttrib(txId: string, from: string) {
    this.pendingAttribs.update(r => {
      // Toggle : clic sur le bouton déjà actif = désélectionner
      if (r[txId] === from) {
        const n = { ...r };
        delete n[txId];
        return n;
      }
      return { ...r, [txId]: from };
    });
  }

  async saveAttribs() {
    const entries = Object.entries(this.pendingAttribs());
    let count = 0;
    for (const [txId, contribFrom] of entries) {
      if (contribFrom !== undefined) {
        await this.budget.updateTransaction(txId, { contribFrom });
        count++;
      }
    }
    this.showUnassigned = false;
    this.pendingAttribs.set({});
    if (count > 0) this.msg.add({ severity: 'success', summary: `${count} virement${count > 1 ? 's' : ''} attribué${count > 1 ? 's' : ''}`, life: 3000 });
  }
}
