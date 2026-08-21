import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { nonAdminGuard } from './guards/non-admin.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

/**
 * Uygulama rotaları.
 *
 * Her rota `loadComponent` ile tembel (lazy) yüklenir: ilk açılışta yalnızca
 * login ekranının kodu indirilir, geri kalan sayfalar ziyaret edildiğinde gelir.
 * `title` alanı tarayıcı sekmesindeki başlığı rota bazında günceller.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Giriş — PYS',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
  },

  { path: '', redirectTo: 'projects', pathMatch: 'full' },

  // ─── Girişi olan herkes ──────────────────────────────────────────────────
  {
    path: 'projects',
    title: 'Projeler — PYS',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/project-list/project-list').then((m) => m.ProjectListComponent),
  },
  {
    path: 'project-add',
    title: 'Proje Öner — PYS',
    canActivate: [authGuard],
    // Form kirliyse (dirty) sayfadan çıkarken kullanıcıya uyarı gösterilir.
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./components/project-add/project-add').then((m) => m.ProjectAddComponent),
  },
  {
    path: 'profile',
    title: 'Profilim — PYS',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile').then((m) => m.ProfileComponent),
  },
  {
    path: 'chat',
    title: 'Sohbet — PYS',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chat/chat').then((m) => m.ChatComponent),
  },

  // ─── Sadece Admin ────────────────────────────────────────────────────────
  {
    path: 'users',
    title: 'Personel — PYS',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/user-list/user-list').then((m) => m.UserListComponent),
  },
  {
    path: 'user-add',
    title: 'Yeni Personel — PYS',
    canActivate: [authGuard, adminGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./components/user-add/user-add').then((m) => m.UserAddComponent),
  },
  {
    path: 'project-workers',
    title: 'Çalışma Dağılımı — PYS',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/project-workers/project-workers').then((m) => m.ProjectWorkersComponent),
  },
  {
    path: 'petitions',
    title: 'Dilekçeler — PYS',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/petitions-admin/petitions-admin').then((m) => m.PetitionsAdminComponent),
  },

  // ─── Sadece normal kullanıcı ─────────────────────────────────────────────
  {
    path: 'my-petitions',
    title: 'Dilekçelerim — PYS',
    canActivate: [authGuard, nonAdminGuard],
    loadComponent: () =>
      import('./components/my-petitions/my-petitions').then((m) => m.MyPetitionsComponent),
  },

  // ─── 404 → ana sayfa (oraya girince authGuard devreye girer) ─────────────
  { path: '**', redirectTo: 'projects' },
];
