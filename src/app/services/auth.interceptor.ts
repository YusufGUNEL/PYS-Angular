import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Her giden isteğe `Authorization: Bearer <token>` başlığını ekler ve
 * sunucudan 401 dönerse oturumu kapatıp kullanıcıyı /login'e yollar.
 *
 * Fonksiyonel interceptor (Angular 15+): `provideHttpClient(withInterceptors([...]))`
 * ile kaydedilir; ayrı `@Injectable` sınıfa ve `HTTP_INTERCEPTORS` token'ına gerek yoktur.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout(true);
      }
      return throwError(() => err);
    }),
  );
};
