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
      <!-- SIDEBAR (desktop) -->
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
              @if (hasCommun()) {
                <a routerLink="commun" routerLinkActive="active" class="nav-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  <span>Compte commun</span>
                  <span class="nav-badge">🏦</span>
                </a>
              }
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
          <!-- Mobile: brand -->
          <div class="brand mobile-brand">
            <span class="brand-icon">💰</span>
            <span class="brand-name">Budget<span class="brand-dot">.</span></span>
          </div>
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

      <!-- BOTTOM NAV (mobile) -->
      <nav class="bottom-nav">
        <a routerLink="stats" routerLinkActive="active" class="bn-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Accueil</span>
        </a>
        <a routerLink="budget" routerLinkActive="active" class="bn-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1H1v1z"/><path d="M22 12v-2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"/><path d="M12 12v.01"/></svg>
          <span>Budget</span>
        </a>
        @if (hasCommun()) {
          <a routerLink="commun" routerLinkActive="active" class="bn-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span>Commun</span>
          </a>
        }
        @if (personAccounts().length === 1) {
          <a [routerLink]="['account', personAccounts()[0].id]" routerLinkActive="active" class="bn-item">
            <span class="bn-emoji">{{ personAccounts()[0].emoji }}</span>
            <span>{{ personAccounts()[0].label }}</span>
          </a>
        } @else if (personAccounts().length > 1) {
          <button class="bn-item" [class.active]="showAccountsDrawer()" (click)="showAccountsDrawer.set(!showAccountsDrawer())">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span>Comptes</span>
          </button>
        }
        <button class="bn-item" [class.active]="showMenuDrawer()" (click)="showMenuDrawer.set(!showMenuDrawer())">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          <span>Plus</span>
        </button>
      </nav>

      <!-- DRAWER : comptes (mobile) -->
      @if (showAccountsDrawer()) {
        <div class="drawer-backdrop" (click)="showAccountsDrawer.set(false)"></div>
        <div class="drawer">
          <div class="drawer-handle"></div>
          <div class="drawer-title">Comptes perso</div>
          @for (acc of personAccounts(); track acc.id) {
            <a [routerLink]="['account', acc.id]" class="drawer-item" (click)="showAccountsDrawer.set(false)">
              <span class="drawer-emoji">{{ acc.emoji }}</span>
              <span>{{ acc.label }}</span>
            </a>
          }
          <button class="drawer-item add-btn" (click)="showAccountsDrawer.set(false); showAddAccount = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>Ajouter un compte</span>
          </button>
        </div>
      }

      <!-- DRAWER : menu plus (mobile) -->
      @if (showMenuDrawer()) {
        <div class="drawer-backdrop" (click)="showMenuDrawer.set(false)"></div>
        <div class="drawer">
          <div class="drawer-handle"></div>
          <div class="drawer-title">Menu</div>
          <a routerLink="categories" class="drawer-item" (click)="showMenuDrawer.set(false)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5"/><path d="M19 19l-4-4"/></svg>
            <span>Catégories & règles</span>
          </a>
          <a routerLink="settings" class="drawer-item" (click)="showMenuDrawer.set(false)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Réglages</span>
          </a>
          @if (auth.currentUser) {
            <div class="drawer-user">
              <div class="user-avatar">{{ initials() }}</div>
              <div class="user-info">
                <div class="user-name">{{ auth.currentUser.displayName || 'Utilisateur' }}</div>
                <div class="user-email">{{ auth.currentUser.email }}</div>
              </div>
            </div>
            <button class="drawer-item logout-item" (click)="auth.logout()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Déconnexion</span>
            </button>
          }
        </div>
      }
    </div>

    <!-- Add account dialog -->
    <p-dialog header="Nouveau compte" [(visible)]="showAddAccount" [modal]="true" [style]="{width:'min(380px, 95vw)'}">
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
    .layout { display: flex; height: 100vh; overflow: hidden; position: relative; }

    /* Sidebar (desktop) */
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
    .mobile-brand { display: none; }

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
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-base); min-width: 0; }
    .topbar {
      height: 52px; display: flex; align-items: center; padding: 0 1.5rem; gap: 1rem;
      border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);
      flex-shrink: 0;
    }
    .month-nav { display: flex; align-items: center; gap: 0.25rem; margin: 0 auto; }
    .month-btn {
      width: 32px; height: 32px; border: none; background: var(--bg-elevated); border-radius: var(--radius-sm);
      color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: var(--transition);
    }
    .month-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .month-label {
      font-size: 0.9rem; font-weight: 600; color: var(--text-primary);
      min-width: 150px; text-align: center; text-transform: capitalize;
    }
    .loading-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

    .content { flex: 1; overflow-y: auto; padding: 1.75rem; }
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 1rem; color: var(--text-muted); }
    .spinner { width: 28px; height: 28px; border: 2px solid var(--border-default); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Bottom nav (mobile only) ───────────────────────── */
    .bottom-nav { display: none; }

    /* ── Drawers (mobile only) ─────────────────────────── */
    .drawer-backdrop { display: none; }
    .drawer { display: none; }

    /* ── Responsive ─────────────────────────────────────── */
    @media (max-width: 640px) {
      .layout { flex-direction: column; }
      .sidebar { display: none; }
      .mobile-brand { display: flex; }

      .topbar { padding: 0 1rem; height: 48px; }
      .month-label { min-width: 130px; font-size: 0.85rem; }
      .content { padding: 1rem 0.875rem; padding-bottom: calc(1rem + 64px); }

      /* Bottom nav */
      .bottom-nav {
        display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
        background: var(--bg-surface); border-top: 1px solid var(--border-subtle);
        height: 60px; padding: 0 0.25rem; padding-bottom: env(safe-area-inset-bottom);
        align-items: stretch; justify-content: space-around;
      }
      .bn-item {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 3px; flex: 1; color: var(--text-muted); font-size: 0.65rem; font-weight: 500;
        text-decoration: none; border: none; background: transparent; font-family: inherit;
        cursor: pointer; padding: 0.25rem; border-radius: var(--radius-md); transition: color 0.15s;
        min-width: 0;
      }
      .bn-item svg { flex-shrink: 0; }
      .bn-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .bn-item.active, .bn-item:active { color: var(--accent-light); }
      .bn-emoji { font-size: 1.1rem; line-height: 1; }

      /* Drawer */
      .drawer-backdrop {
        display: block; position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
      }
      .drawer {
        display: flex; flex-direction: column;
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 201;
        background: var(--bg-card); border-radius: 20px 20px 0 0;
        border-top: 1px solid var(--border-strong);
        padding: 0.75rem 1rem calc(1.5rem + env(safe-area-inset-bottom));
        gap: 0.25rem;
        animation: slideUp 0.25s ease;
      }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .drawer-handle { width: 36px; height: 4px; border-radius: 99px; background: var(--border-strong); margin: 0 auto 1rem; }
      .drawer-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); padding: 0 0.5rem 0.5rem; }
      .drawer-item {
        display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 0.75rem;
        color: var(--text-primary); text-decoration: none; font-size: 0.95rem; font-weight: 500;
        border-radius: var(--radius-md); border: none; background: transparent; font-family: inherit;
        cursor: pointer; width: 100%; text-align: left; transition: background 0.15s;
      }
      .drawer-item:hover, .drawer-item:active { background: var(--bg-elevated); }
      .drawer-emoji { font-size: 1.25rem; }
      .add-btn { color: var(--accent-light); }
      .drawer-user { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; margin: 0.5rem 0; background: var(--bg-elevated); border-radius: var(--radius-md); }
      .logout-item { color: var(--danger) !important; margin-top: 0.25rem; }
    }
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

  showAccountsDrawer = signal(false);
  showMenuDrawer = signal(false);

  personAccounts = () => this.budget.accounts().filter(a => a.type === 'person');
  hasCommun = () => this.budget.accounts().some(a => a.type === 'commun');

  initials(): string {
    const u = this.auth.currentUser;
    if (!u) return '?';
    return (u.displayName?.[0] ?? u.email?.[0] ?? '?').toUpperCase();
  }

  async ngOnInit() {
    await this.budget.loadAll();
    if (this.budget.accounts().length === 0) {
      this.router.navigate(['/onboarding']);
    }
  }

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
