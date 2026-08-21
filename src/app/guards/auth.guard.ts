import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * AuthGuard (Functional API — Angular 14.2+ önerisi).
 *
 * Akış:
 *   1) localStorage'da token yoksa → /login
 *   2) Son 30 sn içinde `fetchMe()` ile token doğrulandıysa → cache (server'a gitme)
 *   3) Aksi halde server'a `GET /api/Auth/Me` ile doğrula
 *   4) 401 ya da network hatası → logout + /login
 *
 * Class-based versiyona göre avantajları:
 *   - `inject()` ile DI; ayrı Injectable sınıf yok
 *   - Tek satır export, daha az boilerplate
 *   - `canActivate: [authGuard]` şeklinde fonksiyon referansı geçirilir
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (!token) return router.createUrlTree(['/login']);

  // Cache: son 30 sn içinde başarılı doğrulama yapıldıysa server'ı tekrar yorma.
  if (auth.isRecentlyVerified()) return true;

  return auth.fetchMe().pipe(
    map(() => true),
    catchError(() => {
      auth.logout(true);
      return of(router.createUrlTree(['/login']));
    }),
  );
};

/**
 * CanMatch versiyonu — lazy-loaded modüllerde bundle indirilmesini bile engeller.
 * Şu an projede lazy route yok ama ileride eklenirse hazır.
 */
export const authMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.getToken() ? true : router.createUrlTree(['/login']);
};

// ─── GERİYE UYUMLULUK ─────────────────────────────────────────────────────
// app.routes.ts hâlâ `AuthGuard` sembolünü import ediyorsa kırılmasın diye
// eski isim de export ediliyor (alias).
export const AuthGuard = authGuard;
