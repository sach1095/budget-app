import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BudgetService } from '../../core/services/budget.service';
import { LocalFileStorageService } from '../../core/services/storage/local-file-storage.service';
import { AuthService } from '../../core/services/auth.service';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { StorageMode } from '../../core/services/storage/storage.interface';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [Button, FormsModule, InputText, Password],
  template: `
    <div class="settings-page">
      <h2 class="page-title">⚙️ Réglages</h2>

      <div class="settings-grid">

        <!-- Stockage -->
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
            @if (hasLocalFS) {
              <button class="mode-card" [class.active]="budget.storageMode() === 'local'" (click)="setMode('local')">
                <div class="mode-icon">💾</div>
                <div>
                  <div class="mode-title">Fichier local</div>
                  <div class="mode-desc">budget_data.json sur votre ordinateur</div>
                </div>
                @if (budget.storageMode() === 'local') { <div class="check">✓</div> }
              </button>
            }
          </div>
          @if (budget.storageMode() === 'local') {
            <p-button label="Changer de dossier" icon="pi pi-folder" [outlined]="true" size="small" (onClick)="changeFolder()" />
          }
        </div>

        <!-- Compte Firebase -->
        @if (auth.currentUser) {
          <div class="settings-section">
            <div class="section-title">Compte connecté</div>
            <div class="account-info">
              <div class="account-avatar">{{ initials() }}</div>
              <div>
                <div class="account-name">{{ auth.currentUser.displayName || 'Utilisateur' }}</div>
                <div class="account-email">{{ auth.currentUser.email || auth.currentUser.phoneNumber || 'Compte anonyme' }}</div>
              </div>
            </div>
            <p-button label="Se déconnecter" icon="pi pi-sign-out" severity="danger" [outlined]="true" size="small" (onClick)="auth.logout()" />
          </div>

          <!-- Méthodes de connexion -->
          <div class="settings-section">
            <div class="section-title">Méthodes de connexion</div>

            <!-- Email -->
            <div class="provider-row">
              <span class="provider-icon">✉️</span>
              <div class="provider-body">
                <div class="provider-name">Email & mot de passe</div>
                @if (hasProvider('password')) {
                  <div class="provider-value">{{ auth.currentUser.email }}</div>
                } @else {
                  <div class="provider-desc">Non configuré</div>
                }
              </div>
              @if (hasProvider('password')) {
                <span class="linked-badge">✓</span>
              } @else {
                <button class="add-btn" (click)="showEmailForm.set(!showEmailForm())">
                  {{ showEmailForm() ? 'Annuler' : 'Lier' }}
                </button>
              }
            </div>

            @if (showEmailForm() && !hasProvider('password')) {
              <div class="link-form">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input pInputText [(ngModel)]="linkEmail" type="email" placeholder="vous@exemple.com" class="w-full" />
                </div>
                <div class="form-group">
                  <label class="form-label">Mot de passe</label>
                  <p-password [(ngModel)]="linkPassword" [toggleMask]="true" [feedback]="false"
                    styleClass="w-full" inputStyleClass="w-full" placeholder="Min. 6 caractères" />
                </div>
                @if (linkError()) { <div class="error-msg">{{ linkError() }}</div> }
                <button class="confirm-btn" [disabled]="linkLoading()" (click)="doLinkEmail()">
                  @if (linkLoading()) { <span class="spinner"></span> En cours… } @else { Confirmer }
                </button>
              </div>
            }

            <div class="provider-divider"></div>

            <!-- Téléphone -->
            <div class="provider-row">
              <span class="provider-icon">📱</span>
              <div class="provider-body">
                <div class="provider-name">Numéro de téléphone</div>
                @if (hasProvider('phone')) {
                  <div class="provider-value">{{ auth.currentUser.phoneNumber }}</div>
                } @else {
                  <div class="provider-desc">Non configuré</div>
                }
              </div>
              @if (hasProvider('phone')) {
                <span class="linked-badge">✓</span>
              } @else {
                <button class="add-btn" (click)="togglePhoneForm()">
                  {{ showPhoneForm() ? 'Annuler' : 'Lier' }}
                </button>
              }
            </div>

            @if (showPhoneForm() && !hasProvider('phone')) {
              <div class="link-form">
                <!-- reCAPTCHA toujours dans le DOM quand le formulaire est ouvert -->
                <div id="rcap-link"></div>

                @if (!phoneCodeSent()) {
                  <div class="form-group">
                    <label class="form-label">Numéro</label>
                    <input pInputText [(ngModel)]="linkPhone" type="tel" placeholder="+33 6 12 34 56 78" class="w-full" />
                  </div>
@if (linkError()) { <div class="error-msg">{{ linkError() }}</div> }
                  <button class="confirm-btn" [disabled]="linkLoading()" (click)="doLinkPhoneSend()">
                    @if (linkLoading()) { <span class="spinner"></span> Envoi… } @else { Envoyer le code SMS }
                  </button>
                } @else {
                  <div class="form-group">
                    <label class="form-label">Code reçu par SMS</label>
                    <input pInputText [(ngModel)]="linkPhoneCode" placeholder="123456" maxlength="6" class="w-full code-input" />
                  </div>
                  @if (linkError()) { <div class="error-msg">{{ linkError() }}</div> }
                  <button class="confirm-btn" [disabled]="linkLoading()" (click)="doLinkPhoneConfirm()">
                    @if (linkLoading()) { <span class="spinner"></span> Vérification… } @else { Vérifier }
                  </button>
                  <button class="text-btn" (click)="phoneCodeSent.set(false)">← Renvoyer le code</button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="settings-section">
            <div class="section-title">Compte</div>
            <p class="no-auth-msg">Mode local — aucune connexion requise.</p>
            <p-button label="Se connecter avec Firebase" icon="pi pi-cloud" [outlined]="true" size="small" (onClick)="router.navigate(['/login'])" />
          </div>
        }

        <!-- Infos -->
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

    /* Storage */
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

    /* Account */
    .account-info { display: flex; align-items: center; gap: 0.75rem; }
    .account-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-grad); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 1rem; flex-shrink: 0; }
    .account-name { font-weight: 600; font-size: 0.9rem; }
    .account-email { font-size: 0.775rem; color: var(--text-muted); }
    .no-auth-msg { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

    /* Providers */
    .provider-row { display: flex; align-items: center; gap: 0.875rem; }
    .provider-icon { font-size: 1.3rem; flex-shrink: 0; }
    .provider-body { flex: 1; min-width: 0; }
    .provider-name { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
    .provider-value { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem; }
    .provider-desc { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.1rem; }
    .linked-badge {
      width: 22px; height: 22px; border-radius: 50%; background: rgba(16,185,129,0.15);
      border: 1.5px solid rgba(16,185,129,0.4); color: var(--success);
      display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
    }
    .add-btn {
      padding: 0.3rem 0.75rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-strong);
      background: var(--bg-elevated); color: var(--accent-light); font-size: 0.78rem; font-weight: 600;
      cursor: pointer; font-family: inherit; flex-shrink: 0; transition: var(--transition);
    }
    .add-btn:hover { background: rgba(139,92,246,0.1); border-color: var(--accent); }
    .provider-divider { height: 1px; background: var(--border-subtle); margin: 0.25rem 0; }

    /* Link form */
    .link-form { background: var(--bg-elevated); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid var(--border-default); }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label { font-size: 0.78rem; font-weight: 500; color: var(--text-secondary); }
    .error-msg { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; }
    .confirm-btn {
      padding: 0.6rem 1rem; border-radius: var(--radius-md); border: none;
      background: var(--accent-grad); color: #fff; font-size: 0.875rem; font-weight: 600;
      font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      transition: opacity var(--transition);
    }
    .confirm-btn:hover:not(:disabled) { opacity: 0.9; }
    .confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .text-btn { background: none; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; font-family: inherit; padding: 0; text-align: left; }
    .text-btn:hover { color: var(--text-secondary); }
    .code-input { text-align: center; letter-spacing: 0.4em; font-size: 1.2rem !important; font-weight: 700 !important; }
    .phone-note { font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4; }

    /* Info */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .info-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-elevated); border-radius: var(--radius-sm); }
    .info-label { font-size: 0.8rem; color: var(--text-secondary); }
    .info-value { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

    @media (max-width: 640px) {
      .settings-page { gap: 1rem; }
      .settings-grid { max-width: 100%; }
      .settings-section { padding: 1rem; gap: 0.875rem; }
      .mode-card { padding: 0.75rem 1rem; gap: 0.75rem; }
      .mode-icon { font-size: 1.25rem; }
      .account-info { gap: 0.625rem; }
      .provider-row { flex-wrap: wrap; }
      .provider-body { min-width: 0; flex: 1; }
    }
  `]
})
export class SettingsComponent {
  budget = inject(BudgetService);
  auth = inject(AuthService);
  private localFS = inject(LocalFileStorageService);
  router = inject(Router);

  readonly hasLocalFS = 'showDirectoryPicker' in window;

  // Link email
  showEmailForm = signal(false);
  linkEmail = '';
  linkPassword = '';

  // Link phone
  showPhoneForm = signal(false);
  linkPhone = '';
  linkPhoneCode = '';
  phoneCodeSent = signal(false);

  // Shared state
  linkError = signal<string | null>(null);
  linkLoading = signal(false);

  // Refresh providers after link (force re-read)
  private _providerRefresh = signal(0);

  hasProvider(id: string): boolean {
    this._providerRefresh(); // dépendance réactive
    return this.auth.linkedProviders().includes(id);
  }

  initials(): string {
    const u = this.auth.currentUser;
    return (u?.displayName?.[0] ?? u?.email?.[0] ?? u?.phoneNumber?.[1] ?? '?').toUpperCase();
  }

  togglePhoneForm() {
    this.phoneCodeSent.set(false);
    this.linkError.set(null);
    this.showPhoneForm.set(!this.showPhoneForm());
  }

  async doLinkEmail() {
    this.linkError.set(null);
    this.linkLoading.set(true);
    try {
      await this.auth.linkEmail(this.linkEmail, this.linkPassword);
      this.showEmailForm.set(false);
      this._providerRefresh.update(v => v + 1);
    } catch (e: any) {
      this.linkError.set(this.friendlyError(e.code));
    } finally {
      this.linkLoading.set(false);
    }
  }

  async doLinkPhoneSend() {
    this.linkError.set(null);
    this.linkLoading.set(true);
    try {
      // Laisser Angular finir de rendre le div #rcap-link avant d'initialiser reCAPTCHA
      await new Promise(r => setTimeout(r, 50));
      await this.auth.linkPhoneSend(this.linkPhone, 'rcap-link');
      this.phoneCodeSent.set(true);
    } catch (e: any) {
      this.linkError.set(this.friendlyError(e.code) || e.message || 'Erreur inconnue');
    } finally {
      this.linkLoading.set(false);
    }
  }

  async doLinkPhoneConfirm() {
    this.linkError.set(null);
    this.linkLoading.set(true);
    try {
      await this.auth.linkPhoneConfirm(this.linkPhoneCode);
      this.showPhoneForm.set(false);
      this.phoneCodeSent.set(false);
      this._providerRefresh.update(v => v + 1);
    } catch (e: any) {
      this.linkError.set('Code invalide. Réessayez.');
    } finally {
      this.linkLoading.set(false);
    }
  }

  async setMode(mode: StorageMode) {
    this.budget.setStorageMode(mode);
    if (mode === 'local') await this.changeFolder();
    else await this.budget.loadAll();
  }

  async changeFolder() {
    const ok = await this.localFS.pickFolder();
    if (ok) await this.budget.loadAll();
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/email-already-in-use': 'Cet email est déjà utilisé par un autre compte.',
      'auth/provider-already-linked': 'Cette méthode est déjà liée à votre compte.',
      'auth/invalid-email': 'Email invalide.',
      'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères).',
      'auth/credential-already-in-use': 'Ce numéro est déjà utilisé par un autre compte.',
      'auth/invalid-phone-number': 'Numéro invalide. Format attendu : +33 6 12 34 56 78',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'auth/operation-not-allowed': "L'auth par téléphone n'est pas activée. Allez dans Firebase Console → Authentication → Sign-in methods et activez \"Téléphone\".",
      'auth/invalid-app-credential': 'Erreur reCAPTCHA. Vérifiez que votre domaine est autorisé dans Firebase Console → Authentication → Paramètres → Domaines autorisés.',
      'auth/missing-phone-number': 'Entrez un numéro de téléphone.',
    };
    return map[code] || '';
  }
}
