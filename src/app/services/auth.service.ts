import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { ApiMessage } from '../models/api.model';
import {
  LoginRequest,
  LoginResponse,
  CurrentUserDto,
  ChangePasswordRequest,
  UpdateProfileRequest,
  isAdminUser,
} from '../models/auth.model';

const TOKEN_KEY = 'pys.token';
const USER_KEY = 'pys.user';
const EXP_KEY = 'pys.exp';

// İstemci tarafı zorlamalı oturum tavanı: Admin de olsa kullanıcı da olsa
// giriş anından en geç 2 saat sonra otomatik çıkış yapılır.
// Backend JwtSettings.ExpiresInHours yanlış yapılandırılsa bile bu sınır
// devreye girer (server expiresAt ile min alınır).
const MAX_SESSION_MS = 2 * 60 * 60 * 1000;

// Guard cache penceresi: son fetchMe()'den bu süre içinde tekrar guard çalışırsa
// server'a tekrar gitme; mevcut oturum verisine güven.
const RECENT_VERIFY_WINDOW_MS = 30 * 1000;

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const safeStorage: Storage =
  typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
    ? localStorage
    : new MemoryStorage();

/**
 * Uygulama genelinde tek auth state'i.
 * Token + user bilgisini localStorage'da saklar, signal ile UI'a yansıtır.
 * exp süresi geçince otomatik logout yapar.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly apiUrl = environment.apiUrl;
  private readonly storage: Storage = safeStorage;

  // Reactive state — header, guard, sayfalar bunu okur.
  readonly currentUser = signal<CurrentUserDto | null>(this.loadUserFromStorage());
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => isAdminUser(this.currentUser()));

  private expiryTimer?: ReturnType<typeof setTimeout>;
  // Son başarılı fetchMe zamanı (epoch ms). Guard'lar yakın zamanda doğrulandıysa
  // tekrar ağ çağrısı yapmaz — sayfa geçişlerinde gereksiz round-trip önlenir.
  private lastVerifiedAt = 0;

  constructor() {
    // Sayfa yenilendi → kalan süreye göre otomatik logout zamanlayıcısı kur.
    this.scheduleAutoLogout();
  }

  /** POST /api/Auth/Login */
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/api/Auth/Login`, req)
      .pipe(tap((res) => this.storeSession(res)));
  }

  /** GET /api/Auth/Me — token geçerli mi & güncel user bilgisi */
  fetchMe(): Observable<CurrentUserDto> {
    return this.http.get<CurrentUserDto>(`${this.apiUrl}/api/Auth/Me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.storage.setItem(USER_KEY, JSON.stringify(user));
        this.lastVerifiedAt = Date.now();
      }),
    );
  }

  /**
   * Guard'lar tarafından kullanılır. true dönerse `fetchMe()` çağrısını atlamak güvenlidir;
   * cache penceresi dolduysa server'a tekrar gidilir.
   */
  isRecentlyVerified(): boolean {
    return !!this.currentUser() && Date.now() - this.lastVerifiedAt < RECENT_VERIFY_WINDOW_MS;
  }

  /** PUT /api/Auth/UpdateProfile */
  updateProfile(req: UpdateProfileRequest): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/Auth/UpdateProfile`, req);
  }

  /** POST /api/Auth/ChangePassword */
  changePassword(req: ChangePasswordRequest): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/api/Auth/ChangePassword`, req);
  }

  /** localStorage'tan oku ve set et (boot zamanı) */
  private loadUserFromStorage(): CurrentUserDto | null {
    try {
      const expStr = this.storage.getItem(EXP_KEY);
      if (expStr && new Date(expStr).getTime() < Date.now()) {
        this.clearStorage();
        return null;
      }
      const raw = this.storage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as CurrentUserDto) : null;
    } catch {
      return null;
    }
  }

  private storeSession(res: LoginResponse): void {
    this.storage.setItem(TOKEN_KEY, res.token);
    this.storage.setItem(USER_KEY, JSON.stringify(res.user));
    // 2 saat tavanı: server'ın bildirdiği expiresAt ile şimdi+2h'yi karşılaştır,
    // hangisi önce gelirse o anı kaydet.
    const serverExp = new Date(res.expiresAt).getTime();
    const clientCap = Date.now() + MAX_SESSION_MS;
    const effectiveExp = new Date(Math.min(serverExp, clientCap)).toISOString();
    this.storage.setItem(EXP_KEY, effectiveExp);
    this.currentUser.set(res.user);
    this.scheduleAutoLogout();
  }

  getToken(): string | null {
    return this.storage.getItem(TOKEN_KEY);
  }

  /** Süre dolunca otomatik logout — interceptor da 401'de bunu çağırır. */
  logout(navigate = true): void {
    this.clearStorage();
    this.currentUser.set(null);
    this.lastVerifiedAt = 0;
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (navigate) this.router.navigate(['/login']);
  }

  private clearStorage(): void {
    this.storage.removeItem(TOKEN_KEY);
    this.storage.removeItem(USER_KEY);
    this.storage.removeItem(EXP_KEY);
  }

  private scheduleAutoLogout(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    const expStr = this.storage.getItem(EXP_KEY);
    if (!expStr) return;
    // Server süresi ile MAX_SESSION_MS tavanını birlikte uygula —
    // sayfa yenilense bile en geç oturum tavanına göre çıkış yapılır.
    const expMs = new Date(expStr).getTime();
    const targetMs = Math.min(expMs, Date.now() + MAX_SESSION_MS);
    const ms = targetMs - Date.now();
    if (ms <= 0) {
      this.logout();
      return;
    }
    this.expiryTimer = setTimeout(() => this.logout(), ms);
  }
}
