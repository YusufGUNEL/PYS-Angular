import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { AuthService } from './services/auth.service';

/** Üst menüde gösterilen bir gezinme bağlantısı. */
interface NavItem {
  link: string;
  label: string;
  icon: string;
}

/** Menünün sağ ucundaki vurgulu eylem butonu. */
interface NavAction extends NavItem {
  /** `primary` tek başına vurgulanır; `outline` ikincil kalır. */
  style: 'primary' | 'outline';
}

/**
 * Kök bileşen: üst menü, sayfa gövdesi (<router-outlet>) ve alt bilgiyi taşır.
 *
 * Menü içeriği `AuthService` signal'larından türetilen tek bir listeden gelir;
 * masaüstü şeridi ile mobil açılır menü aynı kaynağı kullanır.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);

  readonly auth = inject(AuthService);

  /** Giriş ekranındayken menü bağlantıları gizlenir. */
  readonly isLogin = signal(false);

  /** Mobil açılır menünün durumu. */
  readonly menuOpen = signal(false);

  readonly navItems = computed<NavItem[]>(() => {
    if (this.isLogin()) return [];

    const items: NavItem[] = [{ link: '/projects', label: 'Projeler', icon: 'fa-diagram-project' }];
    if (!this.auth.isLoggedIn()) return items;

    if (this.auth.isAdmin()) {
      items.push(
        { link: '/users', label: 'Personel', icon: 'fa-users' },
        { link: '/petitions', label: 'Dilekçeler', icon: 'fa-inbox' },
        { link: '/project-workers', label: 'Çalışma Dağılımı', icon: 'fa-people-group' },
      );
    } else {
      items.push({ link: '/my-petitions', label: 'Dilekçelerim', icon: 'fa-paper-plane' });
    }

    items.push(
      { link: '/chat', label: 'Sohbet', icon: 'fa-comments' },
      { link: '/profile', label: 'Profil', icon: 'fa-user' },
    );
    return items;
  });

  /** Çıkış düğmesi yalnızca oturum açıkken ve giriş ekranı dışında görünür. */
  readonly showLogout = computed(() => this.auth.isLoggedIn() && !this.isLogin());

  readonly navActions = computed<NavAction[]>(() => {
    // Giriş ekranında menü hiçbir eylem göstermez — oturumu açık bir kullanıcı
    // /login adresine gelse bile form üstünde "Proje Öner" gibi butonlar belirmemeli.
    if (this.isLogin()) return [];

    if (!this.auth.isLoggedIn()) {
      return [{ link: '/login', label: 'Giriş', icon: 'fa-right-to-bracket', style: 'primary' }];
    }

    const actions: NavAction[] = [
      { link: '/project-add', label: 'Proje Öner', icon: 'fa-plus', style: 'primary' },
    ];
    if (this.auth.isAdmin()) {
      actions.push({
        link: '/user-add',
        label: 'Yeni Personel',
        icon: 'fa-user-plus',
        style: 'outline',
      });
    }
    return actions;
  });

  constructor() {
    this.isLogin.set(this.router.url === '/login');
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((ev) => {
        this.isLogin.set(ev.urlAfterRedirects === '/login');
        // Sayfa değişince mobil menü açık kalmasın.
        this.menuOpen.set(false);
      });

    this.verifyStoredSession();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  /**
   * Açılışta localStorage'daki token'ı sunucuya doğrulatır.
   * Token süresi dolmuş ya da iptal edilmişse oturum sessizce kapatılır —
   * böylece kullanıcı, ilk isteğinde 401 yemek yerine doğrudan giriş ekranına düşer.
   */
  private verifyStoredSession(): void {
    if (!this.auth.getToken()) return;
    this.auth.fetchMe().subscribe({ error: () => this.auth.logout(true) });
  }

  confirmLogout(): void {
    this.closeMenu();
    this.confirmationService.confirm({
      header: 'Çıkış Onayı',
      message: 'Çıkmak istediğine emin misin?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.auth.logout(true),
    });
  }
}
