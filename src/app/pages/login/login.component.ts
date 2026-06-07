import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, Button, InputText, Password, Tabs, TabList, Tab, TabPanels, TabPanel, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-bg"></div>

      <div class="login-card">
        <div class="login-header">
          <div class="brand">
            <div class="brand-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="url(#grad)"/>
                <path d="M8 14.5C8 10.91 10.91 8 14.5 8C16.18 8 17.71 8.65 18.86 9.71L17.1 11.47C16.39 10.82 15.49 10.43 14.5 10.43C12.26 10.43 10.43 12.26 10.43 14.5C10.43 16.74 12.26 18.57 14.5 18.57C16.25 18.57 17.73 17.44 18.29 15.86H14.5V13.57H20.86C20.95 14.04 21 14.52 21 15C21 18.59 18.09 21.5 14.5 21.5C10.91 21.5 8 18.59 8 15V14.5Z" fill="white"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#8b5cf6"/>
                    <stop offset="1" stop-color="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span class="brand-name">BudgetFlow</span>
          </div>

          <div class="header-text">
            <h2>Bon retour 👋</h2>
            <p>Connectez-vous à votre espace financier</p>
          </div>

          <div class="header-pills">
            <span class="pill">🔒 Sécurisé</span>
            <span class="pill">☁️ Synchronisé</span>
          </div>
        </div>

        <p-tabs [value]="tab()">
          <p-tablist>
            <p-tab value="email" (click)="tab.set('email')">Email</p-tab>
            <p-tab value="phone" (click)="tab.set('phone')">Téléphone</p-tab>
            <p-tab value="register" (click)="tab.set('register')">Inscription</p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- EMAIL LOGIN -->
            <p-tabpanel value="email">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input pInputText [(ngModel)]="email" type="email" placeholder="vous@exemple.com" class="w-full" />
              </div>
              <div class="form-group">
                <label class="form-label">Mot de passe</label>
                <p-password [(ngModel)]="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="••••••••" />
              </div>
              @if (error()) { <div class="error-msg">{{ error() }}</div> }
              <p-button label="Se connecter" icon="pi pi-sign-in" [loading]="loading()" (onClick)="login()" styleClass="w-full submit-btn" />
            </p-tabpanel>

            <!-- PHONE LOGIN -->
            <p-tabpanel value="phone">
              @if (!codeSent()) {
                <div class="form-group">
                  <label class="form-label">Numéro de téléphone</label>
                  <input pInputText [(ngModel)]="phone" type="tel" placeholder="+33 6 12 34 56 78" class="w-full" />
                </div>
                <div id="recaptcha-container"></div>
                @if (error()) { <div class="error-msg">{{ error() }}</div> }
                <p-button label="Envoyer le code SMS" icon="pi pi-mobile" [loading]="loading()" (onClick)="sendSMS()" styleClass="w-full submit-btn" />
                <p class="phone-note">📋 Nécessite le plan Firebase Blaze (payant à l'usage)</p>
              } @else {
                <div class="form-group">
                  <label class="form-label">Code SMS reçu</label>
                  <input pInputText [(ngModel)]="smsCode" type="text" placeholder="123456" maxlength="6" class="w-full code-input" />
                </div>
                @if (error()) { <div class="error-msg">{{ error() }}</div> }
                <p-button label="Vérifier" icon="pi pi-check" [loading]="loading()" (onClick)="confirmCode()" styleClass="w-full submit-btn" />
                <p-button label="← Renvoyer" [text]="true" (onClick)="codeSent.set(false)" styleClass="w-full" />
              }
            </p-tabpanel>

            <!-- REGISTER -->
            <p-tabpanel value="register">
              <div class="form-group">
                <label class="form-label">Prénom</label>
                <input pInputText [(ngModel)]="displayName" placeholder="Sacha" class="w-full" />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input pInputText [(ngModel)]="email" type="email" placeholder="vous@exemple.com" class="w-full" />
              </div>
              <div class="form-group">
                <label class="form-label">Mot de passe</label>
                <p-password [(ngModel)]="password" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Min. 6 caractères" />
              </div>
              @if (error()) { <div class="error-msg">{{ error() }}</div> }
              <p-button label="Créer mon compte" icon="pi pi-user-plus" [loading]="loading()" (onClick)="register()" styleClass="w-full submit-btn" />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>

        <div class="login-footer">
          <a class="back-link" routerLink="/">← Changer de mode de stockage</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      position: relative; padding: 1rem;
    }
    .login-bg {
      position: fixed; inset: 0;
      background: radial-gradient(ellipse 70% 50% at 50% -10%, rgba(139,92,246,0.18) 0%, transparent 70%), var(--bg-base);
      z-index: 0;
    }
    .login-card {
      position: relative; z-index: 1;
      background: var(--bg-card); border: 1px solid var(--border-default);
      border-radius: var(--radius-xl); padding: 2.5rem; width: 100%; max-width: 420px;
      box-shadow: var(--shadow-lg);
    }
    .login-header {
      text-align: center; margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border-default);
    }
    .brand {
      display: inline-flex; align-items: center; gap: 0.6rem;
      margin-bottom: 1.5rem;
    }
    .brand-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(139,92,246,0.4);
    }
    .brand-name {
      font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em;
      background: var(--accent-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .header-text { margin-bottom: 1rem; }
    h2 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.35rem; letter-spacing: -0.02em; }
    p { color: var(--text-secondary); font-size: 0.875rem; margin: 0; }
    .header-pills {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap;
    }
    .pill {
      font-size: 0.7rem; font-weight: 500; color: var(--text-muted);
      background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.15);
      padding: 0.25rem 0.65rem; border-radius: 99px;
    }
    .error-msg {
      background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5; padding: 0.65rem 1rem; border-radius: var(--radius-md);
      font-size: 0.825rem; margin-bottom: 1rem;
    }
    :host ::ng-deep .submit-btn {
      background: var(--accent-grad) !important; border: none !important;
      font-weight: 600 !important; justify-content: center;
      padding: 0.75rem !important;
    }
    .phone-note { font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: 0.75rem; }
    .code-input { text-align: center; letter-spacing: 0.5em; font-size: 1.25rem !important; font-weight: 700 !important; }
    .login-footer { margin-top: 1.5rem; text-align: center; }
    .back-link { font-size: 0.8rem; color: var(--text-muted); text-decoration: none; }
    .back-link:hover { color: var(--accent-light); }
  `]
})
export class LoginComponent implements AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  tab = signal<'email' | 'phone' | 'register'>('email');
  email = ''; password = ''; displayName = ''; phone = ''; smsCode = '';
  error = signal<string | null>(null);
  loading = signal(false);
  codeSent = signal(false);

  async ngAfterViewInit() {
    await this.auth.setupRecaptcha('recaptcha-container');
  }

  login() {
    this.error.set(null); this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: any) => { this.error.set(this.friendlyError(e.code)); this.loading.set(false); }
    });
  }

  register() {
    this.error.set(null); this.loading.set(true);
    this.auth.register(this.email, this.password, this.displayName).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: any) => { this.error.set(this.friendlyError(e.code)); this.loading.set(false); }
    });
  }

  async sendSMS() {
    this.error.set(null); this.loading.set(true);
    try {
      await this.auth.sendPhoneSMS(this.phone);
      this.codeSent.set(true);
    } catch (e: any) { this.error.set(this.friendlyError(e.code) ?? e.message); }
    finally { this.loading.set(false); }
  }

  async confirmCode() {
    this.error.set(null); this.loading.set(true);
    try {
      await this.auth.confirmPhoneCode(this.smsCode);
      this.router.navigate(['/dashboard']);
    } catch (e: any) { this.error.set('Code invalide. Réessayez.'); }
    finally { this.loading.set(false); }
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/invalid-email': 'Email invalide.',
      'auth/user-not-found': 'Utilisateur introuvable.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/email-already-in-use': 'Email déjà utilisé.',
      'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères).',
      'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    };
    return map[code] || 'Erreur : ' + code;
  }
}
