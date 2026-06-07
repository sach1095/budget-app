import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';
import { BudgetService } from '../services/budget.service';

export const authGuard: CanActivateFn = () => {
  const budget = inject(BudgetService);
  const auth = inject(Auth);
  const router = inject(Router);
  // Local mode: always allow
  if (budget.storageMode() === 'local') return true;
  // Firestore mode: require auth
  return user(auth).pipe(
    take(1),
    map(u => u ? true : router.createUrlTree(['/login']))
  );
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return user(auth).pipe(
    take(1),
    map(u => u ? router.createUrlTree(['/dashboard']) : true)
  );
};
