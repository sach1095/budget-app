import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BudgetService } from '../../core/services/budget.service';
import { LocalFileStorageService } from '../../core/services/storage/local-file-storage.service';
import { AuthService } from '../../core/services/auth.service';
import { Button } from 'primeng/button';
import { StorageMode } from '../../core/services/storage/storage.interface';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [Button],
  template: `
    <div class="settings-page">
      <h2 class="page-title">⚙️ Réglages</h2>

      <div class="settings-grid">
        <div class="settings-section">
          <div class="section-title">Stockage des données</div>
          <div class="mode-cards">
            <button class="mode-card" [class.active]="budget.storageMode() === 'firestore'" (click)="setMode('firestore')">
              <div class="mode-icon">☁️</div>
              <div>
                <div class="mode-title">Firebase Cloud</div>
                <div class="mode-desc">Synchro multi-appareils, connexion requise</div>
              </div>
              @if (budget.storageMode() === 'firestore') { <div class="check">✓</div> }
            </button>
            <button class="mode-card" [class.active]="budget.storageMode() === 'local'" (click)="setMode('local')">
              <div class="mode-icon">💾</div>
              <div>
                <div class="mode-title">Fichier local</div>
                <div class="mode-desc">budget_data.json sur votre ordinateur</div>
              </div>
              @if (budget.storageMode() === 'local') { <div class="check">✓</div> }
            </button>
          </div>
          @if (budget.storageMode() === 'local') {
            <p-button label="Changer de dossier" icon="pi pi-folder" [outlined]="true" size="small" (onClick)="changeFolder()" />
          }
        </div>

        <div class="settings-section">
          <div class="section-title">Compte</div>
          @if (auth.currentUser) {
            <div class="account-info">
              <div class="account-avatar">{{ initials() }}</div>
              <div>
                <div class="account-name">{{ auth.currentUser.displayName || 'Utilisateur' }}</div>
                <div class="account-email">{{ auth.currentUser.email }}</div>
              </div>
            </div>
            <p-button label="Se déconnecter" icon="pi pi-sign-out" severity="danger" [outlined]="true" size="small" (onClick)="auth.logout()" />
          } @else {
            <p class="no-auth-msg">Mode local — aucune connexion requise.</p>
            <p-button label="Se connecter avec Firebase" icon="pi pi-cloud" [outlined]="true" size="small" (onClick)="router.navigate(['/login'])" />
          }
        </div>

        <div class="settings-section">
          <div class="section-title">Informations</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Version</span><span class="info-value">1.0.0</span></div>
            <div class="info-item"><span class="info-label">Comptes</span><span class="info-value">{{ budget.accounts().length }}</span></div>
            <div class="info-item"><span class="info-label">Catégories</span><span class="info-value">{{ budget.categories().length }}</span></div>
            <div class="info-item"><span class="info-label">Transactions</span><span class="info-value">{{ budget.transactions().length }}</span></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .settings-grid { display: flex; flex-direction: column; gap: 1.25rem; max-width: 560px; }
    .settings-section {
      background: var(--bg-card); border: 1px solid var(--border-default);
      border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
    }
    .mode-cards { display: flex; flex-direction: column; gap: 0.5rem; }
    .mode-card {
      display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
      background: var(--bg-elevated); border: 1.5px solid var(--border-default);
      border-radius: var(--radius-md); cursor: pointer; transition: var(--transition);
      font-family: inherit; text-align: left; color: var(--text-primary); width: 100%;
    }
    .mode-card:hover { border-color: var(--border-strong); background: var(--bg-hover); }
    .mode-card.active { border-color: var(--accent); background: rgba(139,92,246,0.08); }
    .mode-icon { font-size: 1.5rem; flex-shrink: 0; }
    .mode-title { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
    .mode-desc { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem; }
    .check { margin-left: auto; width: 20px; height: 20px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
    .account-info { display: flex; align-items: center; gap: 0.75rem; }
    .account-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent-grad); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 0.875rem; }
    .account-name { font-weight: 600; font-size: 0.9rem; }
    .account-email { font-size: 0.775rem; color: var(--text-muted); }
    .no-auth-msg { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .info-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-elevated); border-radius: var(--radius-sm); }
    .info-label { font-size: 0.8rem; color: var(--text-secondary); }
    .info-value { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
  `]
})
export class SettingsComponent {
  budget = inject(BudgetService);
  auth = inject(AuthService);
  private localFS = inject(LocalFileStorageService);
  router = inject(Router);

  initials(): string {
    const u = this.auth.currentUser;
    return (u?.displayName?.[0] ?? u?.email?.[0] ?? '?').toUpperCase();
  }

  async setMode(mode: 'firestore' | 'local') {
    this.budget.setStorageMode(mode);
    if (mode === 'local') await this.changeFolder();
    else { await this.budget.loadAll(); }
  }

  async changeFolder() {
    const ok = await this.localFS.pickFolder();
    if (ok) await this.budget.loadAll();
  }
}
