import { Component, inject, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

import { ExpertiseArea, Role, User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { UserUpdateDialogComponent } from '../user-update-dialog/user-update-dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';

/**
 * Personel listesi (yalnızca Admin).
 *
 * Güncelleme ve silme akışları `DialogService` ile açılan ortak dialog'lara
 * devredilir; bu bileşen yalnızca listeyi tazeleme sorumluluğunu taşır.
 */
@Component({
  selector: 'app-user-list',
  imports: [TableModule, ButtonModule, ToastModule, InputTextModule, TooltipModule],
  providers: [MessageService, DialogService],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  users: User[] = [];
  loading = true;

  /** Güncelleme dialog'unun açılır listelerini beslemek için önden çekilir. */
  roles: Role[] = [];
  expertiseAreas: ExpertiseArea[] = [];

  ngOnInit(): void {
    this.loadUsers();
    this.loadDropdownData();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: err?.error?.message || 'Personel listesi yüklenemedi.',
        });
        this.cdr.detectChanges();
      },
    });
  }

  private loadDropdownData(): void {
    this.userService.getRoles().subscribe({ next: (data) => (this.roles = data) });
    this.userService
      .getExpertiseAreas()
      .subscribe({ next: (data) => (this.expertiseAreas = data) });
  }

  deleteUser(user: User): void {
    const ref = this.dialogService.open(ConfirmDialogComponent, {
      header: 'Silme Onayı',
      width: '450px',
      modal: true,
      data: {
        itemLabel: user.fullName,
        itemKindLabel: 'kullanıcıyı',
        successMessage: 'Kullanıcı silindi.',
        errorMessage: 'Kullanıcı silinemedi.',
        action: () => this.userService.deleteUser(user.id),
      },
    });

    ref?.onClose.subscribe((deleted: boolean) => {
      if (deleted) this.loadUsers();
    });
  }

  openEditModal(user: User): void {
    const ref = this.dialogService.open(UserUpdateDialogComponent, {
      header: 'Kullanıcı Güncelle',
      width: '640px',
      modal: true,
      data: { user, roles: this.roles, expertiseAreas: this.expertiseAreas },
    });

    ref?.onClose.subscribe((updated: boolean) => {
      if (updated) this.loadUsers();
    });
  }
}
