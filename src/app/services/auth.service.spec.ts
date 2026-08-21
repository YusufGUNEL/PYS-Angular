import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { CurrentUserDto, LoginResponse } from '../models/auth.model';

const API = 'http://localhost:5058';

const ADMIN: CurrentUserDto = {
  id: 'u-admin',
  fullName: 'Yönetici',
  email: 'admin@pys.local',
  title: 'Yönetici',
  roleId: 'r-admin',
  primaryRoleName: 'Admin',
  expertiseAreaIds: [],
  expertiseNames: [],
  roles: ['Admin'],
  isAdmin: true,
};

const STAFF: CurrentUserDto = {
  ...ADMIN,
  id: 'u-staff',
  primaryRoleName: 'User',
  roles: ['User'],
  isAdmin: false,
};

function loginResponse(expiresAt: string, user = ADMIN): LoginResponse {
  return { token: 'jwt-token', expiresAt, user };
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('login', () => {
    it('oturumu saklar ve currentUser sinyalini doldurur', () => {
      service.login({ email: 'admin@pys.local', password: 'Admin123!' }).subscribe();

      const req = http.expectOne(`${API}/api/Auth/Login`);
      expect(req.request.method).toBe('POST');
      req.flush(loginResponse(new Date(Date.now() + 60 * 60 * 1000).toISOString()));

      expect(service.getToken()).toBe('jwt-token');
      expect(service.currentUser()?.id).toBe('u-admin');
      expect(service.isLoggedIn()).toBe(true);
      expect(service.isAdmin()).toBe(true);
    });

    it('sunucu süresi 2 saatten uzunsa istemci tavanını uygular', () => {
      const tenHours = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
      service.login({ email: 'a@b.c', password: 'x' }).subscribe();
      http.expectOne(`${API}/api/Auth/Login`).flush(loginResponse(tenHours));

      const storedExp = new Date(localStorage.getItem('pys.exp')!).getTime();
      const twoHours = Date.now() + 2 * 60 * 60 * 1000;
      expect(Math.abs(storedExp - twoHours)).toBeLessThan(2000);
    });

    it('sunucu süresi 2 saatten kısaysa sunucuya uyar', () => {
      const thirtyMinutes = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      service.login({ email: 'a@b.c', password: 'x' }).subscribe();
      http.expectOne(`${API}/api/Auth/Login`).flush(loginResponse(thirtyMinutes));

      const storedExp = new Date(localStorage.getItem('pys.exp')!).getTime();
      expect(Math.abs(storedExp - new Date(thirtyMinutes).getTime())).toBeLessThan(1000);
    });

    it('süre dolunca otomatik çıkış yapar', () => {
      service.login({ email: 'a@b.c', password: 'x' }).subscribe();
      http
        .expectOne(`${API}/api/Auth/Login`)
        .flush(loginResponse(new Date(Date.now() + 60 * 1000).toISOString()));
      expect(service.isLoggedIn()).toBe(true);

      vi.advanceTimersByTime(61 * 1000);

      expect(service.isLoggedIn()).toBe(false);
      expect(service.getToken()).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('fetchMe', () => {
    it('kullanıcıyı tazeler ve doğrulama penceresini açar', () => {
      expect(service.isRecentlyVerified()).toBe(false);

      service.fetchMe().subscribe();
      http.expectOne(`${API}/api/Auth/Me`).flush(STAFF);

      expect(service.currentUser()?.id).toBe('u-staff');
      expect(service.isAdmin()).toBe(false);
      expect(service.isRecentlyVerified()).toBe(true);
    });

    it('doğrulama penceresi 30 saniye sonra kapanır', () => {
      service.fetchMe().subscribe();
      http.expectOne(`${API}/api/Auth/Me`).flush(ADMIN);
      expect(service.isRecentlyVerified()).toBe(true);

      vi.advanceTimersByTime(31 * 1000);
      expect(service.isRecentlyVerified()).toBe(false);
    });
  });

  describe('logout', () => {
    it('depoyu temizler ve giriş sayfasına yönlendirir', () => {
      service.login({ email: 'a@b.c', password: 'x' }).subscribe();
      http
        .expectOne(`${API}/api/Auth/Login`)
        .flush(loginResponse(new Date(Date.now() + 60 * 60 * 1000).toISOString()));

      service.logout();

      expect(localStorage.getItem('pys.token')).toBeNull();
      expect(localStorage.getItem('pys.user')).toBeNull();
      expect(localStorage.getItem('pys.exp')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('navigate=false ile yönlendirme yapmaz', () => {
      service.logout(false);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('açılışta depodan okuma', () => {
    it('süresi dolmuş oturumu yok sayar ve depoyu temizler', () => {
      localStorage.setItem('pys.token', 'eski');
      localStorage.setItem('pys.user', JSON.stringify(ADMIN));
      localStorage.setItem('pys.exp', new Date(Date.now() - 1000).toISOString());

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      const fresh = TestBed.inject(AuthService);

      expect(fresh.currentUser()).toBeNull();
      expect(localStorage.getItem('pys.token')).toBeNull();
      http = TestBed.inject(HttpTestingController);
    });

    it('bozuk JSON içeriğinde çökmez', () => {
      localStorage.setItem('pys.user', '{bozuk');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      const fresh = TestBed.inject(AuthService);

      expect(fresh.currentUser()).toBeNull();
      http = TestBed.inject(HttpTestingController);
    });
  });
});
