import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent) },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [
      { path: '', redirectTo: 'stats', pathMatch: 'full' },
      { path: 'stats',      loadComponent: () => import('./pages/stats/stats.component').then(m => m.StatsComponent) },
      { path: 'budget',     loadComponent: () => import('./pages/budget/budget.component').then(m => m.BudgetComponent) },
      { path: 'categories', loadComponent: () => import('./pages/categories/categories.component').then(m => m.CategoriesComponent) },
      { path: 'commun',     loadComponent: () => import('./pages/commun/commun.component').then(m => m.CommunComponent) },
      { path: 'account/:id',loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent) },
      { path: 'settings',   loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
