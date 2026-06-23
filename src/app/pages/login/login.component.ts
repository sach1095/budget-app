import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';

type Screen = 'choose' | 'login' | 'register' | 'phone';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, InputText, Password, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-bg"></div>

      <div class="login-card">

        <!-- Logo -->
        <div class="brand">
          <span class="brand-emoji">💰</span>
          <span class="brand-name">BudgetApp</span>
        </div>

        <!-- ── CHOIX ── -->
        @if (screen() === 'choose') {
          <div class="screen-choose">
            <h2>Bienvenue !</h2>
            <p class="sub">Votre espace financier personnel et familial</p>

            <div class="choice-cards">
              <button class="choice-card" (click)="screen.set('login')">
                <span class="choice-icon">✉️</span>
                <div>
                  <div class="choice-title">Email & mot de passe</div>
                  <div class="choice-desc">Se connecter ou créer un compte</div>
                </div>
                <svg class="choice-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>

              <button class="choice-card" (click)="goToPhone()">
                <span class="choice-icon">📱</span>
                <div>
                  <div class="choice-title">Numéro de téléphone</div>
                  <div class="choice-desc">Connexion par code SMS</div>
                </div>
                <svg class="choice-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>

            <div class="pills">
              <span class="pill">🔒 Données sécurisées</span>
              <span class="pill">☁️ Synchronisé</span>
            </div>
          </div>
        }

        <!-- ── EMAIL : SE CONNECTER / S'INSCRIRE ── -->
        @if (screen() === 'login') {
          <div class="screen-form">
            <button class="back-btn" (click)="screen.set('choose')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour
            </button>
            <h2>Connexion</h2>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input pInputText [(ngModel)]="email" type="email" placeholder="vous@exemple.com" class="w-full" autocomplete="email" />
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe</label>
              <p-password [(ngModel)]="password" [feedback]="false" [toggleMask]="true"
                styleClass="w-full" inputStyleClass="w-full" placeholder="••••••••"
                (keydown.enter)="login()" />
            </div>
            @if (error()) { <div class="error-msg">{{ error() }}</div> }
            <button class="submit-btn" [disabled]="loading()" (click)="login()">
              @if (loading()) { <span class="spinner"></span> Connexion… }
              @else { Se connecter }
            </button>

            <p class="switch-hint">
              Pas encore de compte ?
              <button class="link-btn" (click)="screen.set('register')">Créer un compte</button>
            </p>
          </div>
        }

        <!-- ── INSCRIPTION ── -->
        @if (screen() === 'register') {
          <div class="screen-form">
            <button class="back-btn" (click)="screen.set('login')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour
            </button>
            <h2>Créer un compte</h2>

            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input pInputText [(ngModel)]="displayName" placeholder="Sacha" class="w-full" autocomplete="given-name" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input pInputText [(ngModel)]="email" type="email" placeholder="vous@exemple.com" class="w-full" autocomplete="email" />
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe</label>
              <p-password [(ngModel)]="password" [toggleMask]="true"
                styleClass="w-full" inputStyleClass="w-full" placeholder="Min. 6 caractères" />
            </div>
            @if (error()) { <div class="error-msg">{{ error() }}</div> }
            <button class="submit-btn" [disabled]="loading()" (click)="register()">
              @if (loading()) { <span class="spinner"></span> Création… }
              @else { Créer mon compte }
            </button>

            <p class="switch-hint">
              Déjà inscrit ?
              <button class="link-btn" (click)="screen.set('login')">Se connecter</button>
            </p>
          </div>
        }

        <!-- ── TÉLÉPHONE ── -->
        @if (screen() === 'phone') {
          <div class="screen-form">
            <button class="back-btn" (click)="backFromPhone()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour
            </button>
            <h2>Connexion par SMS</h2>

            <!-- reCAPTCHA container — toujours dans le DOM pendant l'écran phone -->
            <div id="rcap-login"></div>

            @if (!codeSent()) {
              <div class="form-group">
                <label class="form-label">Numéro de téléphone</label>
                <input pInputText [(ngModel)]="phone" type="tel" placeholder="+33 6 12 34 56 78"
                  class="w-full" (keydown.enter)="sendSMS()" />
              </div>
              @if (error()) { <div class="error-msg">{{ error() }}</div> }
              <button class="submit-btn" [disabled]="loading()" (click)="sendSMS()">
                @if (loading()) { <span class="spinner"></span> Envoi… }
                @else { Envoyer le code }
              </button>
            } @else {
              <p class="sms-sent">Code envoyé au <strong>{{ phone }}</strong></p>
              <div class="form-group">
                <label class="form-label">Code reçu par SMS</label>
                <input pInputText [(ngModel)]="smsCode" placeholder="123456" maxlength="6"
                  class="w-full code-input" (keydown.enter)="confirmSMS()" />
              </div>
              @if (error()) { <div class="error-msg">{{ error() }}</div> }
              <button class="submit-btn" [disabled]="loading()" (click)="confirmSMS()">
                @if (loading()) { <span class="spinner"></span> Vérification… }
                @else { Vérifier }
              </button>
              <button class="text-btn" (click)="codeSent.set(false); error.set(null)">
                ← Renvoyer le code
              </button>
            }
          </div>
        }

        <a class="storage-link" routerLink="/">← Changer de mode de stockage</a>
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
      border-radius: var(--radius-xl); padding: 2rem; width: 100%; max-width: 400px;
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 1.5rem;
    }

    .brand { display: flex; align-items: center; gap: 0.6rem; justify-content: center; }
    .brand-emoji { font-size: 1.75rem; }
    .brand-name { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; background: var(--accent-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

    .screen-choose { display: flex; flex-direction: column; gap: 1.25rem; }
    h2 { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin: 0; text-align: center; }
    .sub { color: var(--text-secondary); font-size: 0.875rem; margin: 0; text-align: center; }

    .choice-cards { display: flex; flex-direction: column; gap: 0.75rem; }
    .choice-card {
      display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem;
      background: var(--bg-elevated); border: 1.5px solid var(--border-default);
      border-radius: var(--radius-lg); cursor: pointer; font-family: inherit;
      text-align: left; transition: var(--transition); width: 100%; color: var(--text-primary);
    }
    .choice-card:hover { border-color: var(--border-strong); background: var(--bg-hover); transform: translateY(-1px); }
    .choice-icon { font-size: 1.6rem; flex-shrink: 0; }
    .choice-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.15rem; }
    .choice-desc { font-size: 0.78rem; color: var(--text-muted); }
    .choice-arrow { margin-left: auto; color: var(--text-muted); flex-shrink: 0; }

    .pills { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    .pill { font-size: 0.7rem; color: var(--text-muted); background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.15); padding: 0.25rem 0.65rem; border-radius: 99px; }

    .screen-form { display: flex; flex-direction: column; gap: 1rem; }
    .back-btn {
      display: flex; align-items: center; gap: 0.4rem;
      background: none; border: none; color: var(--text-muted); font-size: 0.82rem;
      cursor: pointer; font-family: inherit; padding: 0; width: fit-content;
      transition: color var(--transition);
    }
    .back-btn:hover { color: var(--text-secondary); }

    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-label { font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); }

    .submit-btn {
      width: 100%; padding: 0.8rem; border-radius: var(--radius-md); border: none;
      background: var(--accent-grad); color: #fff; font-size: 0.95rem; font-weight: 600;
      font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: opacity var(--transition);
    }
    .submit-btn:hover:not(:disabled) { opacity: 0.9; }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .error-msg { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 0.65rem 1rem; border-radius: var(--radius-md); font-size: 0.825rem; }

    .sms-sent { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
    .sms-sent strong { color: var(--text-primary); }
    .code-input { text-align: center; letter-spacing: 0.4em; font-size: 1.2rem !important; font-weight: 700 !important; }
    .text-btn { background: none; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; font-family: inherit; padding: 0; text-align: center; }
    .text-btn:hover { color: var(--text-secondary); }

    .switch-hint { font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 0; }
    .link-btn { background: none; border: none; color: var(--accent-light); font-size: 0.8rem; cursor: pointer; font-family: inherit; font-weight: 500; padding: 0; }
    .link-btn:hover { text-decoration: underline; }

    .storage-link { font-size: 0.75rem; color: var(--text-muted); text-align: center; text-decoration: none; }
    .storage-link:hover { color: var(--accent-light); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  screen = signal<Screen>('choose');
  email = ''; password = ''; displayName = '';
  phone = ''; smsCode = '';
  codeSent = signal(false);
  error = signal<string | null>(null);
  loading = signal(false);

  goToPhone() {
    this.error.set(null);
    this.codeSent.set(false);
    this.phone = ''; this.smsCode = '';
    this.screen.set('phone');
  }

  backFromPhone() {
    this.codeSent.set(false);
    this.error.set(null);
    this.screen.set('choose');
  }

  login() {
    this.error.set(null); this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: any) => { this.error.set(this.friendlyError(e.code, e.message)); this.loading.set(false); }
    });
  }

  register() {
    this.error.set(null); this.loading.set(true);
    this.auth.register(this.email, this.password, this.displayName).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: any) => { this.error.set(this.friendlyError(e.code, e.message)); this.loading.set(false); }
    });
  }

  async sendSMS() {
    this.error.set(null); this.loading.set(true);
    try {
      await new Promise(r => requestAnimationFrame(r)); // laisser Angular rendre #rcap-login
      await this.auth.sendPhoneSMSWithContainer(this.phone, 'rcap-login');
      this.codeSent.set(true);
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code, e.message));
    } finally {
      this.loading.set(false);
    }
  }

  async confirmSMS() {
    this.error.set(null); this.loading.set(true);
    try {
      await this.auth.confirmPhoneCode(this.smsCode);
      this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Code invalide. Réessayez.');
    } finally {
      this.loading.set(false);
    }
  }

  private friendlyError(code: string, rawMessage?: string): string {
    const map: Record<string, string> = {
      'auth/invalid-email': 'Email invalide.',
      'auth/user-not-found': 'Utilisateur introuvable.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/email-already-in-use': 'Email déjà utilisé.',
      'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères).',
      'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      'auth/quota-exceeded': 'Quota SMS dépassé. Réessayez dans 24h.',
      'auth/invalid-phone-number': 'Numéro invalide. Format : +33 6 12 34 56 78',
      'auth/missing-phone-number': 'Entrez un numéro de téléphone.',
      'auth/operation-not-allowed': "Auth téléphone non activée — activez-la dans Firebase Console > Authentication > Sign-in method.",
      'auth/invalid-app-credential': "Erreur reCAPTCHA (auth/invalid-app-credential). Vérifiez : 1) Domaines autorisés dans Firebase Console > Authentication > Settings 2) L'auth téléphone est activée.",
      'auth/captcha-check-failed': "Vérification reCAPTCHA échouée. Rechargez la page et réessayez.",
      'auth/invalid-verification-code': 'Code SMS invalide.',
      'auth/session-expired': 'Session expirée. Renvoyez le code SMS.',
      'auth/unknown': rawMessage ? `Erreur Firebase : ${rawMessage}` : 'Erreur inconnue. Vérifiez la console.',
    };
    return map[code] || (code ? `Erreur Firebase [${code}]${rawMessage ? ' : ' + rawMessage : ''}` : 'Erreur inconnue.');
  }
}
