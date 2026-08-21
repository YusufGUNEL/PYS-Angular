import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * nonAdminGuard: Sadece normal kullanıcıların erişebileceği rotalar (örn. /my-petitions).
 * Admin gelirse /projects'e yönlendirilir.
 */
export const nonAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (!token) return router.createUrlTree(['/login']);

  const decide = () => (!auth.isAdmin() ? true : router.createUrlTree(['/projects']));

  if (auth.isRecentlyVerified()) return decide();

  return auth.fetchMe().pipe(
    map(() => decide()),
    catchError(() => {
      auth.logout(true);
      return of(router.createUrlTree(['/login']));
    }),
  );
};

// Geriye uyumluluk
export const NonAdminGuard = nonAdminGuard;
