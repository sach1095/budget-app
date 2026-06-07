import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { BudgetService } from '../../core/services/budget.service';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Button, Dialog, InputText],
  template: `
    <div class="layout">
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="brand">
            <span class="brand-icon">💰</span>
            <span class="brand-name">Budget<span class="brand-dot">.</span></span>
          </div>

          <nav class="nav">
            <div class="nav-section">
              <a routerLink="stats" routerLinkActive="active" class="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span>Vue globale</span>
              </a>
              <a routerLink="budget" routerLinkActive="active" class="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1H1v1z"/><path d="M22 12v-2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"/><path d="M12 12v.01"/></svg>
                <span>Budget</span>
              </a>
              <a routerLink="commun" routerLinkActive="active" class="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>Compte commun</span>
                <span class="nav-badge">🏦</span>
              </a>
            </div>

            @if (personAccounts().length) {
              <div class="nav-section">
                <div class="nav-label">Comptes perso</div>
                @for (acc of personAccounts(); track acc.id) {
                  <a [routerLink]="['account', acc.id]" routerLinkActive="active" class="nav-item">
                    <span class="nav-emoji">{{ acc.emoji }}</span>
                    <span>{{ acc.label }}</span>
                  </a>
                }
              </div>
            }

            <div class="nav-section">
              <div class="nav-label">Gestion</div>
              <a routerLink="categories" routerLinkActive="active" class="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5"/><path d="M19 19l-4-4"/><path d="M14.5 14.5L19 19"/></svg>
                <span>Catégories</span>
              </a>
              <a routerLink="settings" routerLinkActive="active" class="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>Réglages</span>
              </a>
              <button class="nav-item add-account-btn" (click)="showAddAccount = true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                <span>Ajouter un compte</span>
              </button>
            </div>
          </nav>
        </div>

        <div class="sidebar-bottom">
          <div class="storage-badge" [class.local]="budget.storageMode() === 'local'">
            {{ budget.storageMode() === 'local' ? '💾 Local' : '☁️ Cloud' }}
          </div>
          @if (budget.storageMode() === 'firestore' && auth.currentUser) {
            <div class="user-row">
              <div class="user-avatar">{{ initials() }}</div>
              <div class="user-info">
                <div class="user-name">{{ auth.currentUser.displayName || 'Utilisateur' }}</div>
                <div class="user-email">{{ auth.currentUser.email }}</div>
              </div>
              <button class="logout-btn" (click)="auth.logout()" title="Déconnexion">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          }
        </div>
      </aside>

      <!-- MAIN -->
      <div class="main">
        <header class="topbar">
          <div class="month-nav">
            <button class="month-btn" (click)="changeMonth(-1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="month-label">{{ monthLabel() }}</span>
            <button class="month-btn" (click)="changeMonth(1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          @if (budget.loading()) {
            <div class="loading-dot"></div>
          }
        </header>

        <main class="content">
          @if (budget.loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <span>Chargement…</span>
            </div>
          } @else {
            <router-outlet />
          }
        </main>
      </div>
    </div>

    <!-- Add account dialog -->
    <p-dialog header="Nouveau compte" [(visible)]="showAddAccount" [modal]="true" [style]="{width:'380px'}">
      <div class="form-group">
        <label class="form-label">Nom</label>
        <input pInputText [(ngModel)]="newLabel" placeholder="ex: Marie" class="w-full" />
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-grid">
          @for (e of emojis; track e) {
            <span class="emoji-opt" [class.selected]="newEmoji === e" (click)="newEmoji = e">{{ e }}</span>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showAddAccount = false" />
        <p-button label="Créer" icon="pi pi-check" (onClick)="addAccount()" [disabled]="!newLabel" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .layout { display: flex; height: 100vh; overflow: hidden; }

    /* Sidebar */
    .sidebar {
      width: 230px; min-width: 230px; height: 100vh;
      background: var(--bg-surface); border-right: 1px solid var(--border-subtle);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .sidebar-top { flex: 1; overflow-y: auto; padding: 1.25rem 0.75rem 0.75rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .sidebar-bottom { padding: 0.75rem; border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.5rem; }

    .brand { display: flex; align-items: center; gap: 0.5rem; padding: 0 0.5rem; margin-bottom: 0.25rem; }
    .brand-icon { font-size: 1.25rem; }
    .brand-name { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.03em; }
    .brand-dot { color: var(--accent); }

    .nav { display: flex; flex-direction: column; gap: 1.5rem; }
    .nav-section { display: flex; flex-direction: column; gap: 2px; }
    .nav-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); padding: 0.2rem 0.6rem 0.4rem; }
    .nav-item {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.75rem;
      color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; font-weight: 500;
      border-radius: var(--radius-md); transition: var(--transition); cursor: pointer;
      border: none; background: transparent; width: 100%; font-family: inherit; text-align: left;
    }
    .nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
    .nav-item.active { background: rgba(139,92,246,0.12); color: var(--accent-light); }
    .nav-item svg { flex-shrink: 0; opacity: 0.7; }
    .nav-item.active svg { opacity: 1; }
    .nav-emoji { font-size: 1rem; flex-shrink: 0; }
    .nav-badge { margin-left: auto; font-size: 0.85rem; }
    .add-account-btn { color: var(--text-muted); }
    .add-account-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }

    .storage-badge {
      display: inline-flex; align-self: flex-start;
      font-size: 0.72rem; font-weight: 600; padding: 0.25rem 0.6rem;
      border-radius: 99px; background: rgba(59,130,246,0.1); color: var(--info);
      border: 1px solid rgba(59,130,246,0.2);
    }
    .storage-badge.local { background: rgba(16,185,129,0.1); color: var(--success); border-color: rgba(16,185,129,0.2); }

    .user-row { display: flex; align-items: center; gap: 0.5rem; }
    .user-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: var(--accent-grad); display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #fff;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-email { font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .logout-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 4px; transition: var(--transition); }
    .logout-btn:hover { color: var(--danger); background: rgba(239,68,68,0.1); }

    /* Main */
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-base); }
    .topbar {
      height: 52px; display: flex; align-items: center; padding: 0 1.5rem; gap: 1rem;
      border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);
      flex-shrink: 0;
    }
    .month-nav { display: flex; align-items: center; gap: 0.25rem; }
    .month-btn {
      width: 28px; height: 28px; border: none; background: var(--bg-elevated); border-radius: var(--radius-sm);
      color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: var(--transition);
    }
    .month-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .month-label {
      font-size: 0.9rem; font-weight: 600; color: var(--text-primary);
      min-width: 160px; text-align: center; text-transform: capitalize;
    }
    .loading-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite; margin-left: auto; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

    .content { flex: 1; overflow-y: auto; padding: 1.75rem; }
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 1rem; color: var(--text-muted); }
    .spinner { width: 28px; height: 28px; border: 2px solid var(--border-default); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  budget = inject(BudgetService);
  private router = inject(Router);

  showAddAccount = false;
  newLabel = '';
  newEmoji = '👤';
  emojis = ['👤','👨','👩','🧑','👦','👧','🧔','👴','👵','🐱','🐶','🌟','🔥','💎','🎯','🏆','🐺','🦊','🚀','🌙'];

  personAccounts = () => this.budget.accounts().filter(a => a.type === 'person');

  initials(): string {
    const u = this.auth.currentUser;
    if (!u) return '?';
    return (u.displayName?.[0] ?? u.email?.[0] ?? '?').toUpperCase();
  }

  async ngOnInit() { await this.budget.loadAll(); }

  monthLabel(): string {
    const [y, m] = this.budget.selectedMonth().split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  changeMonth(dir: number) {
    const [y, m] = this.budget.selectedMonth().split('-').map(Number);
    const d = new Date(y, m - 1 + dir);
    this.budget.selectedMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  async addAccount() {
    if (!this.newLabel) return;
    const acc = await this.budget.addAccount({ label: this.newLabel, emoji: this.newEmoji, type: 'person', deletable: true });
    this.showAddAccount = false; this.newLabel = ''; this.newEmoji = '👤';
    this.router.navigate(['/dashboard/account', acc.id]);
  }
}
