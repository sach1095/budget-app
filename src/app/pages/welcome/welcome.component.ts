import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BudgetService } from '../../core/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { LocalFileStorageService } from '../../core/services/storage/local-file-storage.service';
import { StorageMode } from '../../core/services/storage/storage.interface';
import { Button } from 'primeng/button';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [Button],
  template: `
    <div class="welcome">
      <div class="welcome-bg"></div>
      <div class="welcome-content">
        <div class="logo">
          <div class="logo-icon">💰</div>
          <h1>Budget<span class="logo-accent">App</span></h1>
          <p class="tagline">Gérez votre budget en famille, à votre façon.</p>
        </div>

        <div class="mode-cards">
          <button class="mode-card" [class.selected]="selected() === 'firestore'" (click)="selected.set('firestore')">
            <div class="mode-icon">☁️</div>
            <div class="mode-body">
              <div class="mode-title">Cloud Firebase</div>
              <div class="mode-desc">Synchronisé sur tous vos appareils. Connexion requise.</div>
            </div>
            <div class="mode-check" [class.visible]="selected() === 'firestore'">✓</div>
          </button>

          <button class="mode-card" [class.selected]="selected() === 'local'" (click)="selected.set('local')">
            <div class="mode-icon">💾</div>
            <div class="mode-body">
              <div class="mode-title">Fichier local</div>
              <div class="mode-desc">Données sur votre ordinateur. Privé, hors ligne.</div>
            </div>
            <div class="mode-check" [class.visible]="selected() === 'local'">✓</div>
          </button>
        </div>

        <p-button
          [label]="selected() === 'local' ? 'Choisir un dossier →' : 'Continuer →'"
          (onClick)="proceed()"
          styleClass="cta-btn"
        />

        <p class="privacy-note">🔒 Aucune donnée partagée sans votre accord.</p>
      </div>
    </div>
  `,
  styles: [`
    .welcome {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
    }
    .welcome-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%),
                  radial-gradient(ellipse 60% 40% at 80% 100%, rgba(59,130,246,0.08) 0%, transparent 60%),
                  var(--bg-base);
    }
    .welcome-content {
      position: relative; z-index: 1;
      display: flex; flex-direction: column; align-items: center; gap: 2rem;
      padding: 2rem; max-width: 480px; width: 100%;
    }
    .logo { text-align: center; }
    .logo-icon { font-size: 3.5rem; margin-bottom: 0.5rem; }
    h1 { font-size: 2.5rem; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.03em; }
    .logo-accent { background: var(--accent-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .tagline { color: var(--text-secondary); margin: 0.5rem 0 0; font-size: 1rem; }

    .mode-cards { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
    .mode-card {
      display: flex; align-items: center; gap: 1rem;
      background: var(--bg-card); border: 1.5px solid var(--border-default);
      border-radius: var(--radius-lg); padding: 1.25rem 1.5rem;
      cursor: pointer; transition: var(--transition); text-align: left; width: 100%;
      font-family: inherit; color: var(--text-primary);
    }
    .mode-card:hover { border-color: var(--border-strong); background: var(--bg-elevated); transform: translateY(-1px); }
    .mode-card.selected { border-color: var(--accent); background: rgba(139,92,246,0.08); box-shadow: 0 0 0 4px rgba(139,92,246,0.1); }
    .mode-icon { font-size: 2rem; flex-shrink: 0; }
    .mode-body { flex: 1; }
    .mode-title { font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-bottom: 0.2rem; }
    .mode-desc { font-size: 0.825rem; color: var(--text-secondary); }
    .mode-check {
      width: 22px; height: 22px; border-radius: 50%;
      background: var(--accent); color: #fff; font-size: 0.75rem;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transform: scale(0.7); transition: var(--transition);
    }
    .mode-check.visible { opacity: 1; transform: scale(1); }

    :host ::ng-deep .cta-btn {
      width: 100%; justify-content: center;
      background: var(--accent-grad) !important;
      border: none !important;
      padding: 0.875rem 2rem !important;
      font-size: 1rem !important; font-weight: 600 !important;
      border-radius: var(--radius-lg) !important;
    }
    :host ::ng-deep .cta-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--shadow-glow) !important; }

    .privacy-note { font-size: 0.775rem; color: var(--text-muted); text-align: center; }
  `]
})
export class WelcomeComponent implements OnInit {
  private router = inject(Router);
  private budget = inject(BudgetService);
  private auth = inject(AuthService);
  private localFS = inject(LocalFileStorageService);

  selected = signal<StorageMode>('firestore');

  ngOnInit() {
    // If already logged in + same mode → go to dashboard
    this.auth.user$.pipe(take(1)).subscribe(u => {
      const mode = this.budget.storageMode();
      if (mode === 'local') return; // stay on welcome so they can pick folder
      if (u) this.router.navigate(['/dashboard']);
    });
  }

  async proceed() {
    const mode = this.selected();
    this.budget.setStorageMode(mode);
    if (mode === 'local') {
      const ok = await this.localFS.pickFolder();
      if (ok) this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
