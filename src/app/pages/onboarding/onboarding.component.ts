import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BudgetService } from '../../core/services/budget.service';

const EMOJIS = ['👤','👨','👩','🧑','👦','👧','🧔','👴','👵','🧒','🐱','🐶','🌟','🔥','💎','🎯','🏆','🦊','🐺','🦁'];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="onboarding-wrap">
      <div class="onboarding-card">

        <!-- Retour -->
        <button class="ob-back" (click)="goBack()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour
        </button>

        <!-- Logo / titre -->
        <div class="ob-logo">
          <span class="ob-icon">💰</span>
          <h1>Budget App</h1>
          <p class="ob-sub">Configurons votre espace en 2 étapes</p>
        </div>

        <!-- Étape 1 : compte perso -->
        @if (step() === 1) {
          <div class="ob-step">
            <div class="ob-step-label">Étape 1 sur {{ totalSteps() }}</div>
            <h2>Quel est votre prénom ?</h2>
            <p class="ob-hint">Crée votre compte personnel pour suivre vos finances.</p>

            <div class="ob-emoji-row">
              @for (e of emojis; track e) {
                <span class="ob-emoji" [class.selected]="emoji() === e" (click)="emoji.set(e)">{{ e }}</span>
              }
            </div>

            <input
              class="ob-input"
              [(ngModel)]="name"
              placeholder="Votre prénom"
              (keydown.enter)="step1Next()"
              autofocus
            />

            <button class="ob-btn primary" [disabled]="!name.trim()" (click)="step1Next()">
              Continuer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        }

        <!-- Étape 2 : compte commun -->
        @if (step() === 2) {
          <div class="ob-step">
            <div class="ob-step-label">Étape 2 sur {{ totalSteps() }}</div>
            <h2>Un compte commun ?</h2>
            <p class="ob-hint">
              Idéal si vous partagez des dépenses avec quelqu'un (loyer, courses, etc.).
              Vous pourrez toujours en ajouter un plus tard.
            </p>

            <div class="ob-choices">
              <button class="ob-choice" [class.selected]="wantCommun() === true" (click)="wantCommun.set(true)">
                <span class="ob-choice-icon">🏦</span>
                <div>
                  <strong>Oui, créer un compte commun</strong>
                  <span>Pour les dépenses partagées</span>
                </div>
                <span class="ob-check">{{ wantCommun() === true ? '✓' : '' }}</span>
              </button>
              <button class="ob-choice" [class.selected]="wantCommun() === false" (click)="wantCommun.set(false)">
                <span class="ob-choice-icon">👤</span>
                <div>
                  <strong>Non, juste mon compte perso</strong>
                  <span>Je gère seul(e) mes finances</span>
                </div>
                <span class="ob-check">{{ wantCommun() === false ? '✓' : '' }}</span>
              </button>
            </div>

            <div class="ob-actions">
              <button class="ob-btn secondary" (click)="step.set(1)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Retour
              </button>
              <button class="ob-btn primary" [disabled]="wantCommun() === null || saving()" (click)="finish()">
                @if (saving()) {
                  <span class="ob-spinner"></span>
                  Création…
                } @else {
                  Démarrer
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                }
              </button>
            </div>
          </div>
        }

        <!-- Barre de progression -->
        <div class="ob-progress">
          @for (s of [1, 2]; track s) {
            <div class="ob-dot" [class.active]="step() >= s"></div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .onboarding-wrap {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg-base); padding: 1.5rem;
    }
    .onboarding-card {
      width: 100%; max-width: 460px;
      background: var(--bg-card); border: 1px solid var(--border-strong);
      border-radius: 20px; padding: 2.5rem 2rem;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      display: flex; flex-direction: column; gap: 2rem;
    }

    .ob-back {
      display: flex; align-items: center; gap: 0.4rem;
      background: none; border: none; color: var(--text-muted); font-size: 0.82rem;
      cursor: pointer; font-family: inherit; padding: 0; transition: color 0.15s;
    }
    .ob-back:hover { color: var(--text-secondary); }
    .ob-logo { text-align: center; }
    .ob-icon { font-size: 2.5rem; }
    h1 { margin: 0.5rem 0 0.25rem; font-size: 1.6rem; color: var(--text-primary); }
    .ob-sub { margin: 0; font-size: 0.875rem; color: var(--text-muted); }

    .ob-step { display: flex; flex-direction: column; gap: 1.25rem; }
    .ob-step-label { font-size: 0.7rem; font-weight: 700; color: var(--accent-light); text-transform: uppercase; letter-spacing: 0.1em; }
    h2 { margin: 0; font-size: 1.3rem; color: var(--text-primary); }
    .ob-hint { margin: 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }

    .ob-emoji-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .ob-emoji {
      font-size: 1.4rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
      border-radius: 10px; cursor: pointer; border: 2px solid transparent; transition: all 0.15s;
    }
    .ob-emoji:hover { background: var(--bg-elevated); }
    .ob-emoji.selected { border-color: var(--accent); background: rgba(139,92,246,0.1); }

    .ob-input {
      width: 100%; padding: 0.75rem 1rem; background: var(--bg-elevated);
      border: 1px solid var(--border-default); border-radius: var(--radius-md);
      color: var(--text-primary); font-size: 1rem; font-family: inherit; outline: none;
      box-sizing: border-box; transition: border-color 0.15s;
    }
    .ob-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
    .ob-input::placeholder { color: var(--text-muted); }

    .ob-choices { display: flex; flex-direction: column; gap: 0.75rem; }
    .ob-choice {
      display: flex; align-items: center; gap: 0.875rem; padding: 1rem;
      background: var(--bg-elevated); border: 2px solid var(--border-default);
      border-radius: var(--radius-md); cursor: pointer; font-family: inherit; text-align: left;
      transition: all 0.15s; width: 100%;
    }
    .ob-choice:hover { border-color: var(--border-strong); }
    .ob-choice.selected { border-color: var(--accent); background: rgba(139,92,246,0.08); }
    .ob-choice-icon { font-size: 1.5rem; flex-shrink: 0; }
    .ob-choice div { flex: 1; }
    .ob-choice strong { display: block; font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.2rem; }
    .ob-choice span { display: block; font-size: 0.775rem; color: var(--text-muted); }
    .ob-check { font-size: 1rem; color: var(--accent-light); font-weight: 700; width: 20px; text-align: center; flex-shrink: 0; }

    .ob-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .ob-btn {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem;
      border-radius: var(--radius-md); font-size: 0.9rem; font-weight: 600; font-family: inherit;
      cursor: pointer; border: 1.5px solid transparent; transition: all 0.15s;
    }
    .ob-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ob-btn.primary { background: var(--accent-grad); color: #fff; border-color: transparent; }
    .ob-btn.primary:not(:disabled):hover { opacity: 0.9; }
    .ob-btn.secondary { background: var(--bg-elevated); color: var(--text-secondary); border-color: var(--border-default); }
    .ob-btn.secondary:hover { border-color: var(--border-strong); color: var(--text-primary); }

    .ob-progress { display: flex; gap: 0.5rem; justify-content: center; }
    .ob-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-strong); transition: background 0.3s; }
    .ob-dot.active { background: var(--accent-light); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .ob-spinner {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
    }
  `]
})
export class OnboardingComponent implements OnInit {
  private budget = inject(BudgetService);
  private router = inject(Router);

  async ngOnInit() {
    // Si déjà configuré → dashboard directement
    await this.budget.loadAll();
    if (this.budget.accounts().length > 0) {
      this.router.navigate(['/dashboard']);
    }
  }

  emojis = EMOJIS;
  step = signal(1);
  totalSteps = signal(2);
  name = '';
  emoji = signal('👤');
  wantCommun = signal<boolean | null>(null);
  saving = signal(false);

  goBack() {
    this.router.navigate(['/login']);
  }

  step1Next() {
    if (!this.name.trim()) return;
    this.step.set(2);
  }

  async finish() {
    if (this.wantCommun() === null || this.saving()) return;
    this.saving.set(true);
    try {
      // Créer le compte perso
      const id = this.name.trim().toLowerCase().replace(/\s+/g, '_');
      await this.budget.addAccount({
        label: this.name.trim(),
        emoji: this.emoji(),
        type: 'person',
        deletable: true,
      });
      // Créer le compte commun si demandé
      if (this.wantCommun()) {
        await this.budget.addAccount({
          id: 'commun',
          label: 'Compte Commun',
          emoji: '🏦',
          type: 'commun',
          deletable: false,
        } as any);
      }
      this.router.navigate(['/dashboard']);
    } finally {
      this.saving.set(false);
    }
  }
}
