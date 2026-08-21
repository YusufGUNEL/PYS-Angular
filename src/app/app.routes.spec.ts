import { Route } from '@angular/router';

import { routes } from './app.routes';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { nonAdminGuard } from './guards/non-admin.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

const ADMIN_ONLY = ['users', 'user-add', 'project-workers', 'petitions'];
const STAFF_ONLY = ['my-petitions'];
const PUBLIC = ['login'];

function byPath(path: string): Route {
  const route = routes.find((r) => r.path === path);
  expect(route, `"${path}" rotası tanımlı olmalı`).toBeDefined();
  return route!;
}

/** Yönlendirme (redirect) ve joker rotalar bileşen taşımaz. */
const componentRoutes = routes.filter((r) => !r.redirectTo);

describe('uygulama rotaları', () => {
  it('her bileşen rotası tembel yüklenir', () => {
    for (const route of componentRoutes) {
      expect(route.loadComponent, `${route.path} loadComponent kullanmalı`).toBeDefined();
      expect(route.component).toBeUndefined();
    }
  });

  it('her bileşen rotasının sekme başlığı vardır', () => {
    for (const route of componentRoutes) {
      expect(route.title, `${route.path} başlıksız`).toBeTruthy();
    }
  });

  it('giriş dışındaki tüm rotalar authGuard ile korunur', () => {
    for (const route of componentRoutes) {
      if (PUBLIC.includes(route.path!)) continue;
      expect(route.canActivate, `${route.path} korumasız`).toContain(authGuard);
    }
  });

  it('giriş sayfası korumasızdır', () => {
    expect(byPath('login').canActivate).toBeUndefined();
  });

  it('yönetim rotaları adminGuard ister', () => {
    for (const path of ADMIN_ONLY) {
      expect(byPath(path).canActivate, `${path} adminGuard bekliyor`).toContain(adminGuard);
    }
  });

  it('personel rotası admin erişimini engeller', () => {
    for (const path of STAFF_ONLY) {
      expect(byPath(path).canActivate).toContain(nonAdminGuard);
    }
  });

  it('yönetim rotalarında nonAdminGuard bulunmaz', () => {
    for (const path of ADMIN_ONLY) {
      expect(byPath(path).canActivate).not.toContain(nonAdminGuard);
    }
  });

  it('form sayfaları kaydedilmemiş değişiklik uyarısı verir', () => {
    for (const path of ['project-add', 'user-add']) {
      expect(byPath(path).canDeactivate).toContain(unsavedChangesGuard);
    }
  });

  it('kök adres proje listesine yönlendirir', () => {
    const root = routes.find((r) => r.path === '');
    expect(root?.redirectTo).toBe('projects');
    expect(root?.pathMatch).toBe('full');
  });

  it('bilinmeyen adresler joker rota ile yakalanır', () => {
    const wildcard = routes[routes.length - 1];
    expect(wildcard.path).toBe('**');
    expect(wildcard.redirectTo).toBe('projects');
  });
});
