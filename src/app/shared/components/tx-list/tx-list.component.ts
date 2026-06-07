import { Component, Input, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { BudgetService } from '../../../core/services/budget.service';
import { CsvImportService } from '../../../core/services/csv-import.service';
import { Transaction } from '../../../core/models';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-tx-list',
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe, Dialog, Select, InputText, InputNumber, Toast],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" />

    <div class="toolbar">
      <button class="tool-btn primary" (click)="openAdd()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Ajouter
      </button>
      <button class="tool-btn" (click)="fileInput.click()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
        Importer CSV
      </button>
      <input #fileInput type="file" accept=".csv,.tsv" style="display:none" (change)="onFileChange($event)" />
      <button class="tool-btn filter-toggle-btn" [class.active]="showFilters" (click)="showFilters = !showFilters">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Filtrer
        @if (hasActiveFilters()) {
          <span class="filter-dot"></span>
        }
      </button>
      <span class="tx-count">{{ sortedTxs().length }} transaction{{ sortedTxs().length > 1 ? 's' : '' }}</span>
    </div>

    @if (showFilters) {
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Catégorie</label>
          <p-select [ngModel]="filterCat()" (ngModelChange)="filterCat.set($event)"
            [options]="filterCatOptions()" optionLabel="label" optionValue="value"
            placeholder="Toutes" [showClear]="true" styleClass="filter-select" appendTo="body" />
        </div>
        <div class="filter-group">
          <label class="filter-label">Montant min (€)</label>
          <p-inputNumber [ngModel]="filterMin()" (ngModelChange)="filterMin.set($event)"
            [min]="0" [max]="99999" placeholder="0" styleClass="filter-input" />
        </div>
        <div class="filter-group">
          <label class="filter-label">Montant max (€)</label>
          <p-inputNumber [ngModel]="filterMax()" (ngModelChange)="filterMax.set($event)"
            [min]="0" [max]="99999" placeholder="∞" styleClass="filter-input" />
        </div>
        @if (hasActiveFilters()) {
          <button class="tool-btn reset-filter-btn" (click)="clearFilters()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            Réinitialiser
          </button>
        }
      </div>
    }

    <div class="tx-list">
      @for (tx of sortedTxs(); track tx.id) {
        <div class="tx-row" (click)="openEdit(tx)">
          <div class="tx-date">{{ tx.date | date:'dd MMM' }}</div>
          <div class="tx-label">
            {{ tx.label }}
            <i class="pi pi-pencil edit-hint"></i>
          </div>
          @if (budget.isContrib(tx)) {
            <span class="cat-chip contrib-chip">
              💸 {{ contribLabel(tx.contribFrom!) }}
            </span>
          } @else if (tx.contribFrom === '__salaire__') {
            <span class="cat-chip salaire-chip">💰 Salaire</span>
          } @else if (tx.contribFrom === '__epargne__' && tx.accountId !== 'commun') {
            <span class="cat-chip epargne-chip">🏦 Épargne</span>
          } @else {
            <span class="cat-chip" [style.background]="catColor(tx.category) + '22'" [style.color]="catColor(tx.category)">
              {{ tx.category }}
            </span>
          }
          @if (tx.budgetMonth && tx.budgetMonth !== tx.month) {
            <span class="budget-month-chip" title="Comptabilisé en {{ tx.budgetMonth }}">📅 {{ tx.budgetMonth }}</span>
          }
          <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
            {{ tx.amount | currency:'EUR':'symbol':'1.2-2':'fr' }}
          </div>
          <button class="del-btn" (click)="deleteTx(tx, $event)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      } @empty {
        <div class="tx-empty">
          <span>Aucune transaction ce mois-ci</span>
          <button class="tool-btn primary" style="margin-top:0.75rem" (click)="openAdd()">Ajouter la première</button>
        </div>
      }
    </div>

    <!-- Add/Edit dialog -->
    <p-dialog [header]="editTx ? 'Modifier la transaction' : 'Nouvelle transaction'" [(visible)]="showDialog" [modal]="true" [style]="{width:'440px'}">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input pInputText [(ngModel)]="form.date" type="date" class="w-full" />
      </div>
      <div class="form-group">
        <label class="form-label">Libellé</label>
        <input pInputText [(ngModel)]="form.label" placeholder="Description de la transaction" class="w-full" />
      </div>
      <div class="form-group">
        <label class="form-label">Montant <span class="form-hint">— négatif pour une dépense</span></label>
        <p-inputNumber [(ngModel)]="form.amount" [minFractionDigits]="2" [maxFractionDigits]="2" suffix=" €" styleClass="w-full" />
      </div>
      @if (!isVirementEntrant()) {
        <div class="form-group">
          <label class="form-label">Catégorie</label>
          <p-select [(ngModel)]="form.category" [options]="catOptions()" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
        </div>
      }

      <!-- Mois de budget override -->
      <div class="form-group budget-month-row">
        <label class="toggle-label">
          <input type="checkbox" [(ngModel)]="overrideBudgetMonth" (ngModelChange)="onOverrideBudgetMonth($event)" />
          <span>Compter pour un autre mois</span>
          <span class="form-hint">— ex: virement du 30 → mois suivant</span>
        </label>
        @if (overrideBudgetMonth) {
          <input pInputText type="month" [(ngModel)]="form.budgetMonth" class="month-pick" />
        }
      </div>

      @if (form.amount > 0) {
        @if (accountId === 'commun') {
          <div class="contrib-panel">
            <div class="contrib-panel-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Virement entrant — qui a payé ?
            </div>
            <div class="contrib-btns">
              @for (acc of budget.personAccounts(); track acc.id) {
                <button class="contrib-btn" [class.active]="form.contribFrom === acc.id" (click)="form.contribFrom = acc.id">
                  <span class="contrib-emoji">{{ acc.emoji }}</span>
                  <span>{{ acc.label }}</span>
                </button>
              }
              <button class="contrib-btn epargne-btn" [class.active]="form.contribFrom === '__epargne__'" (click)="form.contribFrom = '__epargne__'">
                <span class="contrib-emoji">🏦</span>
                <span>Depuis épargne</span>
              </button>
              <button class="contrib-btn sante-btn" [class.active]="form.contribFrom === '__remboursement_sante__'" (click)="form.contribFrom = '__remboursement_sante__'">
                <span class="contrib-emoji">🏥</span>
                <span>Remboursement santé</span>
              </button>
              <button class="contrib-btn" [class.active]="!form.contribFrom" (click)="form.contribFrom = undefined">
                <span class="contrib-emoji">❓</span>
                <span>Non attribué</span>
              </button>
            </div>
            @if (form.contribFrom) {
              <div class="contrib-hint">Sera comptabilisé comme contribution, pas comme dépense.</div>
            }
          </div>
        } @else {
          <div class="contrib-panel incoming-panel">
            <div class="contrib-panel-title incoming-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Type de rentrée d'argent
            </div>
            <div class="contrib-btns">
              <button class="contrib-btn salaire-btn" [class.active]="form.contribFrom === '__salaire__'" (click)="form.contribFrom = '__salaire__'">
                <span class="contrib-emoji">💰</span>
                <span>Salaire / Paie</span>
              </button>
              <button class="contrib-btn epargne-btn" [class.active]="form.contribFrom === '__epargne__'" (click)="form.contribFrom = '__epargne__'">
                <span class="contrib-emoji">🏦</span>
                <span>Retrait épargne</span>
              </button>
              <button class="contrib-btn" [class.active]="!form.contribFrom" (click)="form.contribFrom = undefined">
                <span class="contrib-emoji">📥</span>
                <span>Autre rentrée</span>
              </button>
            </div>
          </div>
        }
      }

      @if (editTx && similarCount() > 1) {
        <div class="scope-panel">
          <div class="scope-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Appliquer les modifications à…
          </div>
          <div class="scope-choices">
            <button class="scope-btn" [class.active]="applyScope === 'one'" (click)="applyScope = 'one'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              <div>
                <strong>Cette transaction</strong>
                <span>Modification unique</span>
              </div>
            </button>
            <button class="scope-btn" [class.active]="applyScope === 'all'" (click)="applyScope = 'all'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>
              <div>
                <strong>Les {{ similarCount() }} transactions similaires</strong>
                <span>Même marchand, tous les mois</span>
              </div>
            </button>
          </div>

          @if (applyScope === 'all') {
            <label class="save-rule-row">
              <input type="checkbox" [(ngModel)]="saveAsRule" />
              <div>
                <strong>Mémoriser pour les futurs imports</strong>
                <span>Crée une règle automatique — "{{ merchantKeyDisplay() }}" → {{ form.category }}</span>
              </div>
            </label>
          }
        </div>
      }

      <div class="dialog-footer">
        <button class="tool-btn" (click)="showDialog = false">Annuler</button>
        <button class="tool-btn primary-btn" (click)="saveTx()" [disabled]="!form.label || !form.date">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {{ editTx ? 'Valider' : 'Ajouter' }}
        </button>
      </div>
    </p-dialog>

    <!-- Import preview dialog -->
    <p-dialog header="Aperçu de l'import CSV" [(visible)]="showImport" [modal]="true" [style]="{width:'640px'}" (onHide)="editingCatIdx.set(-1)">
      <div class="import-header">
        <div class="import-count">
          <span class="import-num">{{ previewTxs().length }}</span>
          <span class="import-label"> nouvelles transactions — cliquez sur une catégorie pour la modifier</span>
        </div>
      </div>

      <div class="import-list">
        @for (tx of previewTxs(); track $index; let i = $index) {
          <div class="tx-row preview">
            <div class="tx-date">{{ tx.date }}</div>
            <div class="tx-label" style="flex:1">{{ tx.label }}</div>

            @if (editingCatIdx() === i) {
              <p-select
                [ngModel]="tx.category"
                (ngModelChange)="updatePreviewCat(i, $event)"
                [options]="catOptions()"
                optionLabel="label" optionValue="value"
                [autoOptionFocus]="false"
                placeholder="Catégorie"
                styleClass="cat-inline-select"
                appendTo="body"
                (onHide)="editingCatIdx.set(-1)" />
            } @else {
              <span class="cat-chip cat-chip-edit"
                [style.background]="catColor(tx.category) + '22'"
                [style.color]="catColor(tx.category)"
                (click)="editingCatIdx.set(i)"
                title="Cliquer pour modifier">
                {{ tx.category }}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity:0.6"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </span>
            }

            <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
              {{ tx.amount | currency:'EUR':'symbol':'1.2-2':'fr' }}
            </div>
          </div>
        }
      </div>

      @if (importing()) {
        <div class="import-progress-wrap">
          <div class="import-progress-bar" [style.width.%]="importProgress()"></div>
          <span class="import-progress-label">Import en cours… {{ importProgress() }}%</span>
        </div>
      }

      <div class="import-footer">
        <button class="tool-btn" (click)="showImport = false" [disabled]="importing()">Annuler</button>
        <button class="tool-btn primary import-confirm-btn" (click)="confirmImport()" [disabled]="previewTxs().length === 0 || importing()">
          @if (importing()) {
            <span class="spinner"></span>
            Import en cours…
          } @else {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Importer {{ previewTxs().length }} transaction{{ previewTxs().length > 1 ? 's' : '' }}
          }
        </button>
      </div>
    </p-dialog>

    <!-- Column picker dialog (format inconnu ou 0 résultats) -->
    <p-dialog header="Mapping des colonnes CSV" [(visible)]="showColPicker" [modal]="true" [style]="{width:'700px'}">
      <p class="col-picker-sub">
        Format non reconnu automatiquement — indiquez quelle colonne correspond à chaque champ.
      </p>

      <!-- Role selectors per column -->
      <div class="col-roles-bar">
        @for (col of colPickerCols(); track $index; let ci = $index) {
          <div class="col-role-wrap">
            <select class="col-role-sel" [value]="colRoles[ci]" (change)="setColRole(ci, $any($event.target).value)">
              <option value="">— Ignorer</option>
              <option value="date">📅 Date</option>
              <option value="label">📝 Libellé</option>
              <option value="amount">💶 Montant</option>
            </select>
            <span class="col-letter">{{ colLetter(ci) }}</span>
          </div>
        }
      </div>

      <!-- Data preview table -->
      <div class="col-table-wrap">
        <table class="col-table">
          <tbody>
            @for (row of rawPreviewRows(); track $index) {
              <tr>
                @for (cell of row; track $index; let ci = $index) {
                  <td [class]="colRoleClass(ci)">{{ cell || '—' }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="col-picker-footer">
        <span class="col-picker-hint">
          @if (!colMappingReady()) {
            Sélectionnez au moins Date, Libellé et Montant
          } @else {
            ✅ Prêt à prévisualiser
          }
        </span>
        <button class="tool-btn" (click)="showColPicker = false">Annuler</button>
        <button class="tool-btn import-confirm-btn" [disabled]="!colMappingReady()" (click)="applyColMapping()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Prévisualiser
        </button>
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tool-btn {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.875rem;
      background: var(--bg-elevated); border: 1px solid var(--border-default);
      border-radius: var(--radius-md); color: var(--text-secondary); font-size: 0.8rem; font-weight: 500;
      cursor: pointer; font-family: inherit; transition: var(--transition);
    }
    .tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-strong); }
    .tool-btn.primary { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); color: var(--accent-light); }
    .tool-btn.primary:hover { background: rgba(139,92,246,0.25); }
    .tx-count { margin-left: auto; font-size: 0.75rem; color: var(--text-muted); }

    .tx-list { display: flex; flex-direction: column; }
    .tx-row {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0.75rem;
      border-radius: var(--radius-md); cursor: pointer; transition: var(--transition);
      border-bottom: 1px solid var(--border-subtle);
    }
    .tx-row:hover { background: var(--bg-elevated); }
    .tx-row:last-child { border-bottom: none; }
    .tx-row.preview { cursor: default; }
    .tx-row.preview:hover { background: transparent; }

    .tx-date { font-size: 0.775rem; color: var(--text-muted); min-width: 48px; font-variant-numeric: tabular-nums; }
    .tx-label { flex: 1; font-size: 0.875rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .edit-hint { font-size: 0.65rem; color: var(--text-muted); opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
    .tx-row:hover .edit-hint { opacity: 1; }

    .cat-chip { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 99px; white-space: nowrap; flex-shrink: 0; }
    .tx-amount { font-size: 0.875rem; font-weight: 600; min-width: 90px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .positive { color: var(--success); } .negative { color: var(--danger); }

    .del-btn {
      width: 26px; height: 26px; border: none; background: transparent; cursor: pointer;
      color: var(--text-muted); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: var(--transition); flex-shrink: 0;
    }
    .tx-row:hover .del-btn { opacity: 1; }
    .del-btn:hover { background: rgba(239,68,68,0.1); color: var(--danger); }

    .tx-empty { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.875rem; }

    /* Scope panel */
    .scope-panel { background: var(--bg-elevated); border: 1px solid var(--border-accent); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; }
    .scope-title { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem; }
    .scope-choices { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
    .scope-btn {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-align: left;
      background: var(--bg-card); border: 1.5px solid var(--border-default);
      border-radius: var(--radius-md); cursor: pointer; font-family: inherit; transition: var(--transition); width: 100%;
    }
    .scope-btn:hover { border-color: var(--border-strong); }
    .scope-btn.active { border-color: var(--accent); background: rgba(139,92,246,0.08); }
    .scope-btn svg { color: var(--text-muted); flex-shrink: 0; }
    .scope-btn.active svg { color: var(--accent-light); }
    .scope-btn strong { display: block; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.15rem; }
    .scope-btn span { display: block; font-size: 0.75rem; color: var(--text-muted); }
    .save-rule-row {
      display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer;
      border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;
    }
    .save-rule-row input { margin-top: 2px; accent-color: var(--accent); flex-shrink: 0; }
    .save-rule-row strong { display: block; font-size: 0.82rem; color: var(--text-primary); margin-bottom: 0.15rem; }
    .save-rule-row span { display: block; font-size: 0.72rem; color: var(--text-muted); }
    /* Dialog footer custom */
    .dialog-footer { display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 0.5rem; }
    .primary-btn { background: rgba(139,92,246,0.15) !important; border-color: rgba(139,92,246,0.3) !important; color: var(--accent-light) !important; }
    .primary-btn:hover { background: rgba(139,92,246,0.25) !important; }
    .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .import-header { margin-bottom: 1rem; }
    .import-count { display: flex; align-items: baseline; gap: 0.4rem; flex-wrap: wrap; }
    .import-num { font-size: 1.75rem; font-weight: 800; color: var(--accent-light); line-height: 1; }
    .import-label { font-size: 0.82rem; color: var(--text-muted); }
    .import-list { max-height: 360px; overflow-y: auto; display: flex; flex-direction: column; background: var(--bg-elevated); border-radius: var(--radius-md); margin-bottom: 1.25rem; }
    .cat-chip-edit { cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; transition: opacity 0.15s; }
    .cat-chip-edit:hover { opacity: 0.8; }
    :host ::ng-deep .cat-inline-select { min-width: 130px; }
    :host ::ng-deep .cat-inline-select .p-select { padding: 0.2rem 0.5rem !important; font-size: 0.75rem !important; border-radius: 99px !important; }
    /* Fix: texte visible dans p-select (blanc sur blanc en dark mode) */
    :host ::ng-deep .p-select-label { color: var(--text-primary) !important; }
    :host ::ng-deep .p-select-option { color: var(--text-primary) !important; }
    :host ::ng-deep .p-select-option:hover { background: var(--bg-hover) !important; }
    :host ::ng-deep .p-select-option.p-selected { background: rgba(139,92,246,0.15) !important; color: var(--accent-light) !important; }
    .import-footer {
      display: flex; justify-content: flex-end; gap: 0.75rem; align-items: center;
      padding-top: 1rem; border-top: 1px solid var(--border-default);
    }
    .import-confirm-btn {
      background: var(--accent-grad) !important;
      border-color: transparent !important; color: #fff !important;
      font-weight: 600 !important; padding: 0.55rem 1.25rem !important; font-size: 0.875rem !important;
    }
    .import-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    /* Contrib chip */
    .contrib-chip { background: rgba(34,197,94,0.12) !important; color: #4ade80 !important; border: 1px solid rgba(34,197,94,0.25); }
    .salaire-chip { background: rgba(234,179,8,0.12) !important; color: #fbbf24 !important; border: 1px solid rgba(234,179,8,0.25); }
    .epargne-chip { background: rgba(96,165,250,0.12) !important; color: #60a5fa !important; border: 1px solid rgba(96,165,250,0.25); }
    /* Contrib panel */
    .contrib-panel { background: var(--bg-elevated); border: 1px solid rgba(34,197,94,0.25); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; }
    .contrib-panel-title { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; color: #4ade80; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .contrib-btns { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .contrib-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: var(--bg-card); border: 1.5px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; font-family: inherit; font-size: 0.85rem; color: var(--text-secondary); transition: var(--transition); }
    .contrib-btn:hover { border-color: rgba(34,197,94,0.4); color: var(--text-primary); }
    .contrib-btn.active { border-color: #4ade80; background: rgba(34,197,94,0.08); color: #4ade80; font-weight: 600; }
    .contrib-emoji { font-size: 1.1rem; }
    .contrib-hint { font-size: 0.72rem; color: #4ade80; margin-top: 0.6rem; opacity: 0.8; }
    .epargne-btn.active { border-color: #60a5fa !important; background: rgba(96,165,250,0.08) !important; color: #60a5fa !important; }
    .sante-btn.active { border-color: #2dd4bf !important; background: rgba(45,212,191,0.08) !important; color: #2dd4bf !important; }
    .salaire-btn.active { border-color: #fbbf24 !important; background: rgba(251,191,36,0.08) !important; color: #fbbf24 !important; }
    .incoming-panel { border-color: rgba(251,191,36,0.25) !important; }
    .incoming-title { color: #fbbf24 !important; }

    /* Budget month override */
    .budget-month-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.82rem; color: var(--text-secondary); }
    .toggle-label input[type=checkbox] { accent-color: var(--accent); width: 14px; height: 14px; cursor: pointer; }
    .month-pick { padding: 0.35rem 0.6rem; background: var(--bg-elevated); border: 1px solid var(--border-accent); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.82rem; font-family: inherit; outline: none; }
    .month-pick:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(139,92,246,0.15); }
    .budget-month-chip { font-size: 0.68rem; padding: 0.15rem 0.45rem; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: var(--accent-light); border-radius: 6px; white-space: nowrap; flex-shrink: 0; }

    /* Filters */
    .filter-toggle-btn.active { border-color: rgba(139,92,246,0.4) !important; color: var(--accent-light) !important; background: rgba(139,92,246,0.1) !important; }
    .filter-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-light); flex-shrink: 0; }
    .filter-bar {
      display: flex; align-items: flex-end; gap: 1.25rem; flex-wrap: wrap;
      background: var(--bg-elevated); border: 1px solid var(--border-accent);
      border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1rem;
    }
    .filter-group { display: flex; flex-direction: column; gap: 0.4rem; min-width: 140px; }
    .filter-label { font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    :host ::ng-deep .filter-select { min-width: 165px; }
    :host ::ng-deep .filter-input { width: 120px; }
    .reset-filter-btn { align-self: flex-end; color: var(--danger) !important; border-color: rgba(239,68,68,0.3) !important; margin-left: auto; }
    .import-progress-wrap {
      position: relative; height: 6px; background: var(--bg-elevated);
      border-radius: 99px; overflow: hidden; margin-bottom: 1rem;
    }
    .import-progress-bar {
      position: absolute; left: 0; top: 0; height: 100%;
      background: var(--accent-grad); border-radius: 99px;
      transition: width 0.3s ease;
    }
    .import-progress-label { display: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite; flex-shrink: 0;
    }

    /* Column picker */
    .col-picker-sub { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 1rem; }
    .col-roles-bar { display: flex; gap: 0; border: 1px solid var(--border-default); border-radius: var(--radius-md) var(--radius-md) 0 0; overflow: hidden; background: var(--bg-elevated); }
    .col-role-wrap { flex: 1; display: flex; flex-direction: column; align-items: stretch; border-right: 1px solid var(--border-default); min-width: 80px; }
    .col-role-wrap:last-child { border-right: none; }
    .col-letter { text-align: center; font-size: 0.68rem; font-weight: 700; color: var(--text-muted); padding: 0.2rem; background: var(--bg-card); border-top: 1px solid var(--border-default); }
    .col-role-sel {
      padding: 0.35rem 0.25rem; font-size: 0.72rem; font-family: inherit;
      background: var(--bg-elevated); border: none; color: var(--text-primary);
      cursor: pointer; outline: none; width: 100%;
    }
    .col-role-sel:focus { background: var(--bg-hover); }
    .col-table-wrap { overflow-x: auto; border: 1px solid var(--border-default); border-top: none; border-radius: 0 0 var(--radius-md) var(--radius-md); margin-bottom: 1rem; max-height: 240px; overflow-y: auto; }
    .col-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    .col-table tr:nth-child(even) td { background: var(--bg-elevated); }
    .col-table td { padding: 0.35rem 0.6rem; color: var(--text-secondary); border-right: 1px solid var(--border-subtle); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
    .col-table td:last-child { border-right: none; }
    .col-table td.role-date { color: #60a5fa; background: rgba(96,165,250,0.05) !important; }
    .col-table td.role-label { color: var(--text-primary); font-weight: 500; background: rgba(139,92,246,0.04) !important; }
    .col-table td.role-amount { color: var(--success); font-weight: 600; background: rgba(34,197,94,0.04) !important; }
    .col-picker-footer { display: flex; align-items: center; gap: 0.75rem; }
    .col-picker-hint { flex: 1; font-size: 0.78rem; color: var(--text-muted); }
  `]
})
export class TxListComponent {
  @Input() accountId!: string;
  budget = inject(BudgetService);
  csvImport = inject(CsvImportService);
  private msg = inject(MessageService);

  showDialog = false; showImport = false; showFilters = false;
  editTx: Transaction | null = null;
  applyScope: 'one' | 'all' = 'one';
  saveAsRule = false;
  overrideBudgetMonth = false;
  form: { date: string; label: string; amount: number; category: string; contribFrom?: string; budgetMonth?: string } =
    { date: '', label: '', amount: 0, category: 'Divers' };
  previewTxs = signal<Omit<Transaction, 'id'>[]>([]);
  editingCatIdx = signal(-1);
  importing = signal(false);
  importProgress = signal(0); // 0-100

  // Column picker state
  showColPicker = false;
  private rawRows: string[][] = [];
  private rawSep = ';';
  colRoles: string[] = []; // '' | 'date' | 'label' | 'amount' per column index

  colPickerCols = computed(() => this.rawRows[0] ?? []);
  rawPreviewRows = computed(() => this.rawRows.slice(0, 10));

  colLetter(i: number): string { return String.fromCharCode(65 + i); }
  colRoleClass(i: number): string { const r = this.colRoles[i]; return r ? `role-${r}` : ''; }

  colMappingReady = computed(() =>
    this.colRoles.includes('date') &&
    this.colRoles.includes('label') &&
    this.colRoles.includes('amount')
  );

  setColRole(colIdx: number, role: string) {
    // Clear any previous assignment of same role
    if (role) {
      const prev = this.colRoles.indexOf(role);
      if (prev >= 0 && prev !== colIdx) this.colRoles[prev] = '';
    }
    this.colRoles[colIdx] = role;
    this.colRoles = [...this.colRoles]; // trigger computed refresh
  }

  applyColMapping() {
    const mapping = {
      dateCol: this.colRoles.indexOf('date'),
      labelCol: this.colRoles.indexOf('label'),
      amountCol: this.colRoles.indexOf('amount'),
      sep: this.rawSep,
    };
    const parsed = this.csvImport.parseManual(this.rawRows, mapping, this.accountId);
    const existing = this.budget.txForAccount(this.accountId);
    const newTxs = parsed.filter(t => !existing.some(e => e.date === t.date && e.label === t.label && Math.abs(e.amount - t.amount) < 0.01));
    this.previewTxs.set(newTxs);
    this.showColPicker = false;
    this.showImport = true;
  }

  // Filtres
  filterCat = signal<string>('');
  filterMin = signal<number | null>(null);
  filterMax = signal<number | null>(null);

  hasActiveFilters = computed(() =>
    !!this.filterCat() || this.filterMin() !== null || this.filterMax() !== null
  );

  clearFilters() {
    this.filterCat.set('');
    this.filterMin.set(null);
    this.filterMax.set(null);
  }

  sortedTxs = computed(() => {
    let txs = this.budget.txForAccount(this.accountId, this.budget.selectedMonth())
      .slice().sort((a, b) => b.date.localeCompare(a.date));

    const cat = this.filterCat();
    const min = this.filterMin();
    const max = this.filterMax();

    if (cat === '__contrib__') {
      txs = txs.filter(t => this.budget.isContrib(t));
    } else if (cat) {
      txs = txs.filter(t => t.category === cat);
    }
    if (min !== null) txs = txs.filter(t => Math.abs(t.amount) >= min);
    if (max !== null) txs = txs.filter(t => Math.abs(t.amount) <= max);

    return txs;
  });

  catOptions = computed(() =>
    this.budget.categories()
      .map(c => ({ label: c.name, value: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  );

  filterCatOptions = computed(() => {
    const cats = this.budget.categories()
      .map(c => ({ label: c.name, value: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    if (this.accountId === 'commun') {
      cats.unshift({ label: '💸 Contributions', value: '__contrib__' });
    }
    return cats;
  });

  catColor(name: string) { return this.budget.categories().find(c => c.name === name)?.color ?? '#64748b'; }

  openAdd() {
    this.editTx = null; this.applyScope = 'one'; this.saveAsRule = false; this.overrideBudgetMonth = false;
    const d = new Date();
    this.form = { date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, label: '', amount: 0, category: 'Divers', contribFrom: undefined, budgetMonth: undefined };
    this.showDialog = true;
  }

  openEdit(tx: Transaction) {
    this.editTx = tx; this.applyScope = 'one'; this.saveAsRule = false;
    this.overrideBudgetMonth = !!(tx.budgetMonth && tx.budgetMonth !== tx.month);
    this.form = { date: tx.date, label: tx.label, amount: tx.amount, category: tx.category, contribFrom: tx.contribFrom, budgetMonth: tx.budgetMonth };
    this.showDialog = true;
  }

  onOverrideBudgetMonth(checked: boolean) {
    if (checked) {
      // Par défaut : mois suivant la date de la transaction
      const base = this.form.date ? this.form.date.substring(0, 7) : this.budget.selectedMonth();
      const [y, m] = base.split('-').map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      this.form.budgetMonth = next;
    } else {
      this.form.budgetMonth = undefined;
    }
  }

  merchantKeyDisplay(): string {
    return this.editTx ? this.budget.merchantKey(this.editTx.label) : '';
  }

  isVirementEntrant(): boolean {
    return this.accountId === 'commun' && this.form.amount > 0;
  }

  contribLabel(accountId: string): string {
    if (accountId === '__salaire__') return 'Salaire';
    if (accountId === '__epargne__') return 'Depuis épargne';
    if (accountId === '__remboursement_sante__') return 'Remboursement santé';
    const acc = this.budget.accounts().find(a => a.id === accountId);
    return acc ? `Payé par ${acc.label}` : 'Contribution';
  }

  similarCount = computed(() => {
    if (!this.editTx) return 0;
    const key = this.budget.merchantKey(this.editTx.label);
    return this.budget.transactions().filter(t => this.budget.merchantKey(t.label) === key).length;
  });

  async saveTx() {
    if (!this.form.label || !this.form.date) return;
    const month = this.form.date.substring(0, 7);
    const contribFrom = this.form.amount > 0 ? this.form.contribFrom : undefined;
    const budgetMonth = this.overrideBudgetMonth ? this.form.budgetMonth : undefined;

    if (this.editTx) {
      if (this.applyScope === 'all') {
        const key = this.budget.merchantKey(this.editTx.label);
        await this.budget.updateTransactionsBulk(
          t => this.budget.merchantKey(t.label) === key,
          { label: this.form.label, category: this.form.category, contribFrom }
        );
        if (this.saveAsRule && key) {
          const existing = this.budget.rules();
          const alreadyExists = existing.some(r => r.category === this.form.category && r.keywords.includes(key.toUpperCase()));
          if (!alreadyExists) {
            await this.budget.saveRules([...existing, { keywords: [key.toUpperCase()], category: this.form.category }]);
          }
        }
        this.msg.add({ severity: 'success', summary: `${this.similarCount()} transactions mises à jour`, life: 3000 });
      } else {
        await this.budget.updateTransaction(this.editTx.id, { ...this.form, month, contribFrom, budgetMonth });
        this.msg.add({ severity: 'success', summary: 'Transaction modifiée', life: 2000 });
      }
    } else {
      await this.budget.addTransaction({ ...this.form, month, accountId: this.accountId, contribFrom, budgetMonth });
      this.msg.add({ severity: 'success', summary: 'Transaction ajoutée', life: 2000 });
    }
    this.showDialog = false;
  }

  async deleteTx(tx: Transaction, e: Event) {
    e.stopPropagation();
    await this.budget.deleteTransaction(tx.id);
  }

  async onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';

    const txs = await this.csvImport.parseFile(file, this.accountId);
    if (txs.length > 0) {
      const existing = this.budget.txForAccount(this.accountId);
      const newTxs = txs.filter(t => !existing.some(e => e.date === t.date && e.label === t.label && Math.abs(e.amount - t.amount) < 0.01));
      this.previewTxs.set(newTxs);
      this.showImport = true;
    } else {
      // Format inconnu ou BOM — montrer le col picker
      const { rows, sep } = await this.csvImport.getRawRows(file);
      if (rows.length === 0) {
        this.msg.add({ severity: 'warn', summary: 'Fichier vide', detail: 'Le fichier ne contient aucune donnée.', life: 4000 });
        return;
      }
      this.rawRows = rows;
      this.rawSep = sep;
      // Auto-detect column count from first row with most columns
      const ncols = Math.max(...rows.slice(0, 5).map(r => r.length));
      this.colRoles = Array(ncols).fill('');
      // Try to auto-suggest: find column that looks like a date (DD/MM/YYYY)
      const dateRe = /^\d{2}\/\d{2}\/\d{4}$/;
      const amtRe = /^-?\d+[,.]?\d*$/;
      for (let c = 0; c < ncols; c++) {
        const sample = rows.slice(0, 5).map(r => (r[c] ?? '').trim());
        if (sample.some(v => dateRe.test(v))) { this.colRoles[c] = 'date'; continue; }
        if (sample.filter(v => amtRe.test(v.replace(',', '.').replace(/\s/g, ''))).length >= 2) {
          if (!this.colRoles.includes('amount')) { this.colRoles[c] = 'amount'; continue; }
        }
      }
      this.colRoles = [...this.colRoles];
      this.showColPicker = true;
    }
  }

  updatePreviewCat(idx: number, category: string) {
    const list = [...this.previewTxs()];
    list[idx] = { ...list[idx], category };
    this.previewTxs.set(list);
    this.editingCatIdx.set(-1);
  }

  async confirmImport() {
    if (this.importing()) return; // garde anti double-clic
    this.importing.set(true);
    this.importProgress.set(0);
    try {
      // Dédup robuste : re-vérifier au moment du clic (pas au moment du preview)
      const allExisting = this.budget.transactions();
      const toImport = this.previewTxs().filter(t =>
        !allExisting.some(e =>
          e.accountId === this.accountId &&
          e.date === t.date &&
          e.amount === t.amount &&
          e.label === t.label
        )
      );
      if (toImport.length === 0) {
        this.msg.add({ severity: 'warn', summary: 'Aucune nouvelle transaction', detail: 'Toutes existent déjà.', life: 4000 });
        return;
      }
      // Import par lots avec progression
      const batchSize = 10;
      let done = 0;
      for (let i = 0; i < toImport.length; i += batchSize) {
        const batch = toImport.slice(i, i + batchSize);
        await this.budget.importTransactions(batch, this.accountId);
        done += batch.length;
        this.importProgress.set(Math.round((done / toImport.length) * 100));
      }
      this.msg.add({ severity: 'success', summary: `${toImport.length} transactions importées`, life: 3000 });
      this.showImport = false;
      this.editingCatIdx.set(-1);
    } finally {
      this.importing.set(false);
      this.importProgress.set(0);
    }
  }
}
