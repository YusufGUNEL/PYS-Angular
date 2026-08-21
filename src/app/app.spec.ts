import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ConfirmationService } from 'primeng/api';

import { App } from './app';
import { AuthService } from './services/auth.service';

describe('App (kök bileşen)', () => {
  const loggedIn = signal(false);
  const admin = signal(false);

  let auth: {
    isLoggedIn: typeof loggedIn;
    isAdmin: typeof admin;
    getToken: ReturnType<typeof vi.fn>;
    fetchMe: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  async function render() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    loggedIn.set(false);
    admin.set(false);

    auth = {
      isLoggedIn: loggedIn,
      isAdmin: admin,
      getToken: vi.fn().mockReturnValue(null),
      fetchMe: vi.fn().mockReturnValue(of({})),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), ConfirmationService, { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it('oluşturulur', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('marka adını gösterir', async () => {
    expect((await render()).textContent).toContain('PYS');
  });

  it('token yoksa oturum doğrulama isteği atmaz', () => {
    TestBed.createComponent(App);
    expect(auth.fetchMe).not.toHaveBeenCalled();
  });

  it('token varsa oturumu sunucuda doğrular', () => {
    auth.getToken.mockReturnValue('jwt');
    TestBed.createComponent(App);
    expect(auth.fetchMe).toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('token geçersizse sessizce çıkış yapar', () => {
    auth.getToken.mockReturnValue('süresi-dolmuş');
    auth.fetchMe.mockReturnValue(throwError(() => ({ status: 401 })));

    TestBed.createComponent(App);

    expect(auth.logout).toHaveBeenCalledWith(true);
  });

  it('giriş yapılmamışken Giriş bağlantısını gösterir', async () => {
    const el = await render();
    expect(el.textContent).toContain('Giriş');
    expect(el.textContent).not.toContain('Profil');
  });

  it('giriş yapan kullanıcıya Profil ve Sohbet menülerini gösterir', async () => {
    loggedIn.set(true);
    const el = await render();
    expect(el.textContent).toContain('Profil');
    expect(el.textContent).toContain('Sohbet');
  });

  it('admin olmayan kullanıcıya yönetim menülerini göstermez', async () => {
    loggedIn.set(true);
    const el = await render();
    expect(el.textContent).not.toContain('Personel');
    expect(el.textContent).not.toContain('Çalışma Dağılımı');
  });

  it('giriş ekranında menü tamamen boştur', () => {
    // Oturumu açık bir kullanıcı /login adresine gelse bile navbar eylem göstermemeli.
    loggedIn.set(true);
    admin.set(true);
    const app = TestBed.createComponent(App).componentInstance;
    app.isLogin.set(true);

    expect(app.navItems()).toHaveLength(0);
    expect(app.navActions()).toHaveLength(0);
    expect(app.showLogout()).toBe(false);
  });

  it('giriş yapılmamışken giriş ekranı dışında Giriş butonu görünür', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.isLogin.set(false);

    expect(app.navActions().map((a) => a.link)).toContain('/login');
  });

  it('oturum açıkken çıkış düğmesi görünür', () => {
    loggedIn.set(true);
    const app = TestBed.createComponent(App).componentInstance;
    app.isLogin.set(false);

    expect(app.showLogout()).toBe(true);
  });

  it('mobil menü varsayılan olarak kapalıdır', () => {
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.menuOpen()).toBe(false);
  });

  it('mobil menü açılıp kapanır', () => {
    const app = TestBed.createComponent(App).componentInstance;

    app.toggleMenu();
    expect(app.menuOpen()).toBe(true);

    app.toggleMenu();
    expect(app.menuOpen()).toBe(false);
  });

  it('menü öğeleri role göre kurulur', () => {
    loggedIn.set(true);
    admin.set(true);
    const app = TestBed.createComponent(App).componentInstance;

    const links = app.navItems().map((i) => i.link);
    expect(links).toContain('/users');
    expect(links).toContain('/project-workers');
    expect(links).not.toContain('/my-petitions');
  });

  it('personel yönetim bağlantılarını görmez, kendi dilekçelerini görür', () => {
    loggedIn.set(true);
    const app = TestBed.createComponent(App).componentInstance;

    const links = app.navItems().map((i) => i.link);
    expect(links).toContain('/my-petitions');
    expect(links).not.toContain('/users');
  });

  it('her menü öğesinin metin etiketi vardır', () => {
    loggedIn.set(true);
    admin.set(true);
    const app = TestBed.createComponent(App).componentInstance;

    for (const item of app.navItems()) {
      expect(item.label.trim().length, `${item.link} etiketsiz`).toBeGreaterThan(0);
    }
  });

  it('yalnızca tek bir vurgulu eylem butonu bulunur', () => {
    loggedIn.set(true);
    admin.set(true);
    const app = TestBed.createComponent(App).componentInstance;

    const primaries = app.navActions().filter((a) => a.style === 'primary');
    expect(primaries).toHaveLength(1);
  });

  it('admine yönetim menülerini gösterir', async () => {
    loggedIn.set(true);
    admin.set(true);
    const el = await render();
    expect(el.textContent).toContain('Personel');
    expect(el.textContent).toContain('Dilekçeler');
    expect(el.textContent).toContain('Çalışma Dağılımı');
  });
});
