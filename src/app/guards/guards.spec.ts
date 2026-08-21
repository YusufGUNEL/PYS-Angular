import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';
import { nonAdminGuard } from './non-admin.guard';
import { AuthService } from '../services/auth.service';

interface AuthStub {
  getToken: ReturnType<typeof vi.fn>;
  isAdmin: ReturnType<typeof vi.fn>;
  isRecentlyVerified: ReturnType<typeof vi.fn>;
  fetchMe: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
}

let auth: AuthStub;
let router: Router;

/** Guard'lar `inject()` kullandığı için enjeksiyon bağlamı içinde çalıştırılır. */
function run(guard: typeof authGuard) {
  return TestBed.runInInjectionContext(
    () => guard(null as never, null as never) as boolean | UrlTree,
  );
}

/** Guard bir Observable döndürdüğünde ilk değeri senkron olarak alır. */
function runAsync(guard: typeof authGuard): boolean | UrlTree {
  const result = TestBed.runInInjectionContext(() => guard(null as never, null as never));
  let emitted: boolean | UrlTree | undefined;
  (result as Observable<boolean | UrlTree>).subscribe((value) => (emitted = value));
  return emitted!;
}

function expectRedirect(result: unknown, path: string) {
  expect(result).toBeInstanceOf(UrlTree);
  expect(router.serializeUrl(result as UrlTree)).toBe(path);
}

beforeEach(() => {
  auth = {
    getToken: vi.fn().mockReturnValue('jwt'),
    isAdmin: vi.fn().mockReturnValue(false),
    isRecentlyVerified: vi.fn().mockReturnValue(true),
    fetchMe: vi.fn().mockReturnValue(of({})),
    logout: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: auth }],
  });

  router = TestBed.inject(Router);
});

describe('authGuard', () => {
  it('token yoksa /login e yönlendirir', () => {
    auth.getToken.mockReturnValue(null);
    expectRedirect(run(authGuard), '/login');
  });

  it('yakın zamanda doğrulanmışsa sunucuya gitmeden geçirir', () => {
    expect(run(authGuard)).toBe(true);
    expect(auth.fetchMe).not.toHaveBeenCalled();
  });

  it('önbellek süresi dolmuşsa sunucuda doğrular', () => {
    auth.isRecentlyVerified.mockReturnValue(false);

    expect(runAsync(authGuard)).toBe(true);
    expect(auth.fetchMe).toHaveBeenCalled();
  });

  it('doğrulama başarısızsa çıkış yapıp /login e yönlendirir', () => {
    auth.isRecentlyVerified.mockReturnValue(false);
    auth.fetchMe.mockReturnValue(throwError(() => ({ status: 401 })));

    const result = runAsync(authGuard);

    expect(auth.logout).toHaveBeenCalledWith(true);
    expectRedirect(result, '/login');
  });
});

describe('adminGuard', () => {
  it('admin kullanıcıyı geçirir', () => {
    auth.isAdmin.mockReturnValue(true);
    expect(run(adminGuard)).toBe(true);
  });

  it('admin olmayanı /projects e yönlendirir', () => {
    expectRedirect(run(adminGuard), '/projects');
  });

  it('token yoksa /login e yönlendirir', () => {
    auth.getToken.mockReturnValue(null);
    expectRedirect(run(adminGuard), '/login');
  });
});

describe('nonAdminGuard', () => {
  it('normal kullanıcıyı geçirir', () => {
    expect(run(nonAdminGuard)).toBe(true);
  });

  it('admini /projects e yönlendirir', () => {
    auth.isAdmin.mockReturnValue(true);
    expectRedirect(run(nonAdminGuard), '/projects');
  });
});
