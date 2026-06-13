import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { Transaction } from '../../core/models';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Select } from 'primeng/select';
import { Category, CatRule } from '../../core/models';
import { DEFAULT_RULES, DEFAULT_SANTE_KEYWORDS } from '../../core/models/defaults';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule, DecimalPipe, Button, InputText, InputNumber, Dialog, ConfirmDialog, Toast, Select],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="cat-page">

      <!-- ── Catégories ── -->
      <div class="section-card">
        <div class="section-head">
          <div>
            <h2 class="page-title">🏷️ Catégories</h2>
            <p class="section-sub">Définissez vos catégories et leur budget mensuel</p>
          </div>
          <p-button label="Ajouter" icon="pi pi-plus" (onClick)="openAddCat()" />
        </div>
        <div class="cat-grid">
          @for (cat of budget.categories(); track cat.name) {
            <div class="cat-card">
              <div class="cat-header">
                <span class="cat-dot" [style.background]="cat.color"></span>
                <span class="cat-name">{{ cat.name }}</span>
                <div class="cat-actions">
                  <button class="icon-btn" (click)="openEditCat(cat)" title="Modifier">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  </button>
                  <button class="icon-btn danger" (click)="deleteCat(cat.name)" title="Supprimer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              </div>
              <div class="cat-budget">{{ cat.budget > 0 ? cat.budget + ' €/mois' : 'Pas de budget' }}</div>
            </div>
          }
        </div>
      </div>

      <!-- ── Mots-clés Remboursement Santé ── -->
      <div class="section-card">
        <div class="section-head">
          <div>
            <h2 class="page-title">🏥 Mots-clés Remboursement Santé</h2>
            <p class="section-sub">Virements entrants sur le compte commun dont le libellé contient ces mots → tagués automatiquement comme "Remboursement santé"</p>
          </div>
          <div class="rules-actions">
            <button class="tool-btn danger-btn" (click)="resetSante()">Réinitialiser</button>
          </div>
        </div>

        <div class="sante-kw-wrap">
          @for (kw of budget.santeKeywords(); track kw; let i = $index) {
            <span class="sante-chip">
              {{ kw }}
              <button class="sante-del" (click)="removeSanteKw(i)" title="Supprimer">×</button>
            </span>
          }
          @if (!addingSante) {
            <button class="sante-add-btn" (click)="addingSante = true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Ajouter
            </button>
          } @else {
            <div class="sante-add-row">
              <input class="sante-input" [(ngModel)]="newSanteKw" placeholder="Ex: CPAM" (keyup.enter)="confirmAddSante()" (keyup.escape)="addingSante = false" />
              <button class="tool-btn confirm-btn" (click)="confirmAddSante()">Ajouter</button>
              <button class="tool-btn" (click)="addingSante = false">Annuler</button>
            </div>
          }
        </div>
      </div>

      <!-- ── Règles de catégorisation ── -->
      <div class="section-card">
        <div class="section-head">
          <div>
            <h2 class="page-title">⚡ Règles de catégorisation</h2>
            <p class="section-sub">Mots-clés détectés dans les libellés → catégorie assignée automatiquement</p>
          </div>
          <div class="rules-actions">
            <button class="tool-btn" (click)="importRulesCsv()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              Importer CSV
            </button>
            <input #ruleFileInput type="file" accept=".csv" style="display:none" (change)="onRuleFileChange($event)" />
            <button class="tool-btn" (click)="exportRulesCsv()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exporter CSV
            </button>
            <button class="tool-btn recat-btn" (click)="openRecat()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Recatégoriser
            </button>
            <button class="tool-btn danger-btn" (click)="resetRules()">Réinitialiser</button>
            <button class="tool-btn primary-btn" (click)="openAddRule()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Ajouter
            </button>
          </div>
        </div>

        <div class="rules-list">
          <div class="rules-header-row">
            <span>Mots-clés (au moins un doit apparaître dans le libellé)</span>
            <span>→ Catégorie</span>
            <span></span>
          </div>
          @for (rule of budget.rules(); track $index; let i = $index) {
            <div class="rule-row">
              <div class="keywords-wrap">
                @for (kw of rule.keywords; track kw) {
                  <span class="kw-chip">{{ kw }}</span>
                }
              </div>
              <div class="rule-arrow">→</div>
              <div class="rule-cat">
                <span class="cat-dot-sm" [style.background]="catColor(rule.category)"></span>
                {{ rule.category }}
              </div>
              <div class="rule-btns">
                <button class="icon-btn" (click)="openEditRule(i, rule)" title="Modifier">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                </button>
                <button class="icon-btn danger" (click)="deleteRule(i)" title="Supprimer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Dialog recatégorisation -->
    <p-dialog header="Recatégorisation automatique" [(visible)]="showRecatDialog" [modal]="true" [style]="{width:'640px'}" (onShow)="buildRecatList()">
      <div class="recat-summary">
        <span class="recat-count">{{ recatList.length }}</span> transaction{{ recatList.length > 1 ? 's' : '' }} seraient recatégorisées selon les règles actuelles.
        <span class="recat-selected">{{ selectedRecatIds.size }} sélectionnée{{ selectedRecatIds.size > 1 ? 's' : '' }}</span>
      </div>

      <div class="recat-toolbar">
        <button class="tool-btn" (click)="selectAllRecat()">Tout sélectionner</button>
        <button class="tool-btn" (click)="deselectAllRecat()">Tout décocher</button>
      </div>

      @if (recatList.length === 0) {
        <div class="recat-empty">✅ Toutes les transactions sont déjà correctement catégorisées.</div>
      } @else {
        <div class="recat-list">
          @for (item of recatList; track item.tx.id) {
            <label class="recat-row" [class.checked]="selectedRecatIds.has(item.tx.id)">
              <input type="checkbox" [checked]="selectedRecatIds.has(item.tx.id)" (change)="toggleRecat(item.tx.id)" />
              <div class="recat-meta">
                <span class="recat-date">{{ item.tx.date }}</span>
                <span class="recat-label">{{ item.tx.label }}</span>
              </div>
              <div class="recat-cats">
                <span class="recat-old-chip" [style.background]="catColor(item.tx.category) + '22'" [style.color]="catColor(item.tx.category)">
                  {{ item.tx.category }}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="recat-new-chip" [style.background]="catColor(item.newCat) + '22'" [style.color]="catColor(item.newCat)">
                  {{ item.newCat }}
                </span>
              </div>
              <span class="recat-amount" [class.positive]="item.tx.amount > 0" [class.negative]="item.tx.amount < 0">
                {{ item.tx.amount > 0 ? '+' : '' }}{{ item.tx.amount | number:'1.0-0' }} €
              </span>
            </label>
          }
        </div>
      }

      <div class="dlg-footer">
        <button class="tool-btn" (click)="showRecatDialog = false">Annuler</button>
        <button class="tool-btn confirm-btn" [disabled]="selectedRecatIds.size === 0 || applyingRecat" (click)="applyRecat()">
          @if (applyingRecat) { <span class="spinner-sm"></span> }
          Appliquer ({{ selectedRecatIds.size }})
        </button>
      </div>
    </p-dialog>

    <!-- Dialog catégorie -->
    <p-dialog [header]="editCatMode ? 'Modifier catégorie' : 'Nouvelle catégorie'" [(visible)]="showCatDialog" [modal]="true" [style]="{width:'380px'}">
      <div class="form-group">
        <label class="form-label">Nom</label>
        <input pInputText [(ngModel)]="catForm.name" placeholder="Nom de la catégorie" class="w-full" />
      </div>
      <div class="form-group">
        <label class="form-label">Couleur</label>
        <div class="color-row">
          <input type="color" [(ngModel)]="catForm.color" class="color-pick" />
          <span class="color-preview" [style.background]="catForm.color"></span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Budget mensuel (€)</label>
        <p-inputNumber [(ngModel)]="catForm.budget" [min]="0" suffix=" €" styleClass="w-full" />
      </div>
      <div class="dlg-footer">
        <button class="tool-btn" (click)="showCatDialog = false">Annuler</button>
        <button class="tool-btn confirm-btn" (click)="saveCat()" [disabled]="!catForm.name">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {{ editCatMode ? 'Modifier' : 'Créer' }}
        </button>
      </div>
    </p-dialog>

    <!-- Dialog règle -->
    <p-dialog [header]="editRuleIdx() >= 0 ? 'Modifier la règle' : 'Nouvelle règle'" [(visible)]="showRuleDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="form-group">
        <label class="form-label">Catégorie cible</label>
        <p-select [(ngModel)]="ruleForm.category" [options]="catOptions()" optionLabel="label" optionValue="value" styleClass="w-full" />
      </div>
      <div class="form-group">
        <label class="form-label">Mots-clés <span class="form-hint">— un par ligne, insensible à la casse</span></label>
        <textarea [(ngModel)]="ruleForm.keywordsRaw" rows="6" placeholder="FRANPRIX&#10;CARREFOUR&#10;MONOPRIX" class="kw-textarea"></textarea>
      </div>
      <div class="dlg-footer">
        <button class="tool-btn" (click)="showRuleDialog = false">Annuler</button>
        <button class="tool-btn confirm-btn" (click)="saveRule()" [disabled]="!ruleForm.category || !ruleForm.keywordsRaw.trim()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {{ editRuleIdx() >= 0 ? 'Modifier' : 'Ajouter' }}
        </button>
      </div>
    </p-dialog>
  `,
  styles: [`
    .cat-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .section-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.5rem; }
    .section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .page-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.2rem; }
    .section-sub { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

    /* Categories grid */
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.75rem; }
    .cat-card { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 0.875rem; }
    .cat-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
    .cat-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .cat-name { flex: 1; color: var(--text-primary); font-weight: 600; font-size: 0.875rem; }
    .cat-actions { display: flex; gap: 0.25rem; }
    .cat-budget { color: var(--text-muted); font-size: 0.78rem; padding-left: 20px; }

    /* Icon buttons */
    .icon-btn { width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; transition: var(--transition); }
    .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .icon-btn.danger:hover { background: rgba(239,68,68,0.1); color: var(--danger); }

    /* Tool buttons */
    .rules-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .tool-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 0.78rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: var(--transition); }
    .tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .primary-btn { background: rgba(139,92,246,0.15) !important; border-color: rgba(139,92,246,0.3) !important; color: var(--accent-light) !important; }
    .primary-btn:hover { background: rgba(139,92,246,0.25) !important; }
    .danger-btn { border-color: rgba(239,68,68,0.25) !important; color: rgba(239,68,68,0.7) !important; }
    .danger-btn:hover { background: rgba(239,68,68,0.1) !important; color: var(--danger) !important; }

    /* Rules list */
    .rules-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
    .rules-header-row { display: grid; grid-template-columns: 1fr 40px 160px 60px; gap: 0.75rem; padding: 0.5rem 0.875rem; background: var(--bg-elevated); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .rule-row { display: grid; grid-template-columns: 1fr 40px 160px 60px; gap: 0.75rem; padding: 0.6rem 0.875rem; align-items: center; border-top: 1px solid var(--border-subtle); transition: var(--transition); }
    .rule-row:hover { background: var(--bg-elevated); }
    .keywords-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
    .kw-chip { font-size: 0.68rem; font-weight: 500; padding: 0.15rem 0.45rem; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: var(--accent-light); border-radius: 4px; font-family: monospace; }
    .rule-arrow { color: var(--text-muted); font-size: 1rem; text-align: center; }
    .rule-cat { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-primary); font-weight: 500; }
    .cat-dot-sm { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .rule-btns { display: flex; gap: 0.2rem; justify-content: flex-end; }

    /* Form */
    .color-row { display: flex; align-items: center; gap: 0.75rem; }
    .color-pick { width: 48px; height: 36px; border: none; border-radius: 6px; cursor: pointer; background: none; }
    .color-preview { width: 36px; height: 36px; border-radius: 8px; }
    .kw-textarea { width: 100%; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.85rem; font-family: monospace; padding: 0.65rem 0.875rem; resize: vertical; outline: none; transition: var(--transition); }
    .kw-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
    .dlg-footer { display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); margin-top: 0.5rem; }
    .confirm-btn { background: rgba(139,92,246,0.15) !important; border-color: rgba(139,92,246,0.3) !important; color: var(--accent-light) !important; }
    .confirm-btn:hover { background: rgba(139,92,246,0.25) !important; }
    .confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Recatégorisation */
    .recat-btn { border-color: rgba(99,102,241,0.3) !important; color: rgba(99,102,241,0.9) !important; }
    .recat-btn:hover { background: rgba(99,102,241,0.1) !important; }
    .recat-summary { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--text-muted); }
    .recat-count { font-size: 1.5rem; font-weight: 800; color: var(--accent-light); line-height: 1; }
    .recat-selected { margin-left: auto; font-size: 0.78rem; color: var(--text-muted); }
    .recat-toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.875rem; }
    .recat-empty { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
    .recat-list { max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 0.75rem; }
    .recat-row {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem;
      cursor: pointer; transition: background 0.12s; border-top: 1px solid var(--border-subtle);
    }
    .recat-row:first-child { border-top: none; }
    .recat-row:hover { background: var(--bg-elevated); }
    .recat-row.checked { background: rgba(139,92,246,0.05); }
    .recat-row input[type=checkbox] { accent-color: var(--accent); width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
    .recat-meta { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .recat-date { font-size: 0.72rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .recat-label { font-size: 0.82rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .recat-cats { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .recat-old-chip, .recat-new-chip { font-size: 0.68rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 99px; white-space: nowrap; }
    .recat-amount { font-size: 0.82rem; font-weight: 600; min-width: 60px; text-align: right; flex-shrink: 0; }
    .recat-amount.positive { color: var(--success); } .recat-amount.negative { color: var(--danger); }
    .spinner-sm { width: 12px; height: 12px; border: 2px solid rgba(139,92,246,0.3); border-top-color: var(--accent-light); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Santé keywords */
    .sante-kw-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .sante-chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem;
      background: rgba(45,212,191,0.1); border: 1px solid rgba(45,212,191,0.3);
      color: #2dd4bf; border-radius: 6px; font-family: monospace;
    }
    .sante-del {
      background: none; border: none; cursor: pointer; color: #2dd4bf;
      font-size: 1rem; line-height: 1; padding: 0; opacity: 0.6; transition: opacity 0.15s;
    }
    .sante-del:hover { opacity: 1; }
    .sante-add-btn {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.75rem; padding: 0.25rem 0.65rem;
      background: rgba(45,212,191,0.08); border: 1px dashed rgba(45,212,191,0.35);
      color: #2dd4bf; border-radius: 6px; cursor: pointer; font-family: inherit; transition: var(--transition);
    }
    .sante-add-btn:hover { background: rgba(45,212,191,0.15); }
    .sante-add-row { display: flex; align-items: center; gap: 0.5rem; }
    .sante-input {
      padding: 0.3rem 0.6rem; font-size: 0.82rem; font-family: monospace;
      background: var(--bg-elevated); border: 1px solid rgba(45,212,191,0.4);
      border-radius: var(--radius-md); color: var(--text-primary);
      outline: none; width: 160px;
    }
    .sante-input:focus { border-color: #2dd4bf; box-shadow: 0 0 0 2px rgba(45,212,191,0.15); }

    @media (max-width: 640px) {
      .cat-page { gap: 1rem; }
      .section-card { padding: 1rem; }

      /* Cat grid : 2 colonnes sur mobile */
      .cat-grid { grid-template-columns: 1fr 1fr; }
      .cat-card { padding: 0.75rem; }

      /* Section head : actions sous le titre */
      .section-head { flex-direction: column; align-items: flex-start; }
      .rules-actions { width: 100%; justify-content: flex-start; }

      /* Rules list : grille simplifiée — cacher la flèche, réduire la col catégorie */
      .rules-header-row { display: none; }
      .rule-row { grid-template-columns: 1fr auto 40px; gap: 0.5rem; }
      .rule-arrow { display: none; }
      .rule-cat { font-size: 0.72rem; }
      .rule-cat .cat-dot-sm { display: none; }

      /* Recat dialog : simplifier les lignes */
      .recat-list { max-height: 55vh; }
      .recat-row { flex-wrap: wrap; gap: 0.4rem; padding: 0.5rem 0.75rem; }
      .recat-cats { order: 3; width: 100%; padding-left: 24px; }
      .recat-amount { margin-left: auto; }

      /* Sante add row */
      .sante-add-row { flex-wrap: wrap; }
      .sante-input { width: 100%; }
    }
  `]
})
export class CategoriesComponent {
  budget = inject(BudgetService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);

  // ── Catégories ──
  showCatDialog = false;
  editCatMode = false;
  originalCatName = '';
  catForm: Category = { name: '', color: '#8b5cf6', budget: 0 };

  catOptions = () => this.budget.categories().map(c => ({ label: c.name, value: c.name }));
  catColor(name: string) { return this.budget.categories().find(c => c.name === name)?.color ?? '#64748b'; }

  openAddCat() { this.editCatMode = false; this.catForm = { name: '', color: '#8b5cf6', budget: 0 }; this.showCatDialog = true; }
  openEditCat(cat: Category) { this.editCatMode = true; this.originalCatName = cat.name; this.catForm = { ...cat }; this.showCatDialog = true; }

  async saveCat() {
    if (!this.catForm.name) return;
    if (this.editCatMode) {
      await this.budget.updateCategory(this.originalCatName, this.catForm);
      this.msg.add({ severity: 'success', summary: 'Modifié' });
    } else {
      await this.budget.addCategory({ ...this.catForm });
      this.msg.add({ severity: 'success', summary: 'Créée' });
    }
    this.showCatDialog = false;
  }

  deleteCat(name: string) {
    this.confirm.confirm({
      message: `Supprimer "${name}" ? Les transactions seront réaffectées à "Divers".`,
      header: 'Confirmer', icon: 'pi pi-trash',
      accept: async () => { await this.budget.deleteCategory(name); }
    });
  }

  // ── Règles ──
  showRuleDialog = false;
  editRuleIdx = signal(-1);
  ruleForm = { category: '', keywordsRaw: '' };

  openAddRule() {
    this.editRuleIdx.set(-1);
    this.ruleForm = { category: this.budget.categories()[0]?.name ?? '', keywordsRaw: '' };
    this.showRuleDialog = true;
  }

  openEditRule(idx: number, rule: CatRule) {
    this.editRuleIdx.set(idx);
    this.ruleForm = { category: rule.category, keywordsRaw: rule.keywords.join('\n') };
    this.showRuleDialog = true;
  }

  async saveRule() {
    const keywords = this.ruleForm.keywordsRaw.split('\n').map(k => k.trim().toUpperCase()).filter(Boolean);
    if (!keywords.length || !this.ruleForm.category) return;
    const newRule: CatRule = { keywords, category: this.ruleForm.category };
    const list = [...this.budget.rules()];
    if (this.editRuleIdx() >= 0) list[this.editRuleIdx()] = newRule;
    else list.push(newRule);
    await this.budget.saveRules(list);
    this.msg.add({ severity: 'success', summary: this.editRuleIdx() >= 0 ? 'Règle modifiée' : 'Règle ajoutée' });
    this.showRuleDialog = false;
  }

  async deleteRule(idx: number) {
    const list = this.budget.rules().filter((_, i) => i !== idx);
    await this.budget.saveRules(list);
  }

  async resetRules() {
    this.confirm.confirm({
      message: 'Réinitialiser toutes les règles aux valeurs par défaut ?',
      header: 'Confirmer',
      accept: async () => {
        await this.budget.saveRules(DEFAULT_RULES());
        this.msg.add({ severity: 'info', summary: 'Règles réinitialisées' });
      }
    });
  }

  // ── Import/Export CSV ──
  importRulesCsv() { document.querySelector<HTMLInputElement>('input[type=file][accept=".csv"]')?.click(); }

  async onRuleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const rules: CatRule[] = [];
    for (const line of lines) {
      const sep = line.lastIndexOf(',');
      if (sep < 0) continue;
      const kws = line.substring(0, sep).split('|').map(k => k.trim().toUpperCase()).filter(Boolean);
      const cat = line.substring(sep + 1).trim().replace(/^"|"$/g, '');
      if (kws.length && cat) rules.push({ keywords: kws, category: cat });
    }
    if (rules.length) {
      await this.budget.saveRules(rules);
      this.msg.add({ severity: 'success', summary: `${rules.length} règles importées` });
    }
    (event.target as HTMLInputElement).value = '';
  }

  exportRulesCsv() {
    const rows = this.budget.rules().map(r => `${r.keywords.join('|')},${r.category}`);
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'regles_categorisation.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  // ── Recatégorisation ──
  showRecatDialog = false;
  recatList: { tx: Transaction; newCat: string }[] = [];
  selectedRecatIds = new Set<string>();
  applyingRecat = false;

  openRecat() {
    this.buildRecatList();
    this.showRecatDialog = true;
  }

  buildRecatList() {
    this.recatList = this.budget.transactions()
      .filter(t => !this.budget.isContrib(t) && t.amount < 0) // seulement les dépenses
      .map(t => ({ tx: t, newCat: this.budget.autoCategorize(t.label) }))
      .filter(item => item.newCat !== item.tx.category);
    this.selectedRecatIds = new Set(this.recatList.map(i => i.tx.id)); // tout sélectionner par défaut
  }

  selectAllRecat() { this.selectedRecatIds = new Set(this.recatList.map(i => i.tx.id)); }
  deselectAllRecat() { this.selectedRecatIds = new Set(); }
  toggleRecat(id: string) {
    if (this.selectedRecatIds.has(id)) this.selectedRecatIds.delete(id);
    else this.selectedRecatIds.add(id);
    this.selectedRecatIds = new Set(this.selectedRecatIds); // force reference change for change detection
  }

  async applyRecat() {
    if (this.applyingRecat) return;
    this.applyingRecat = true;
    try {
      for (const item of this.recatList) {
        if (this.selectedRecatIds.has(item.tx.id)) {
          await this.budget.updateTransaction(item.tx.id, { category: item.newCat });
        }
      }
      const n = this.selectedRecatIds.size;
      this.msg.add({ severity: 'success', summary: `${n} transaction${n > 1 ? 's' : ''} recatégorisée${n > 1 ? 's' : ''}`, life: 3000 });
      this.showRecatDialog = false;
    } finally {
      this.applyingRecat = false;
    }
  }

  // ── Mots-clés Santé ──
  addingSante = false;
  newSanteKw = '';

  async removeSanteKw(idx: number) {
    const list = this.budget.santeKeywords().filter((_, i) => i !== idx);
    await this.budget.saveSanteKeywords(list);
  }

  async confirmAddSante() {
    const kw = this.newSanteKw.trim().toUpperCase();
    if (!kw) { this.addingSante = false; return; }
    const list = [...this.budget.santeKeywords()];
    if (!list.includes(kw)) {
      list.push(kw);
      await this.budget.saveSanteKeywords(list);
    }
    this.newSanteKw = '';
    this.addingSante = false;
  }

  async resetSante() {
    this.confirm.confirm({
      message: 'Réinitialiser les mots-clés santé aux valeurs par défaut ?',
      header: 'Confirmer',
      accept: async () => {
        await this.budget.saveSanteKeywords(DEFAULT_SANTE_KEYWORDS());
        this.msg.add({ severity: 'info', summary: 'Mots-clés réinitialisés' });
      }
    });
  }
}
