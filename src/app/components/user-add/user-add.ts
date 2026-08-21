import { NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { CreateUserModel, ExpertiseArea, Role } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';
import {
  EMAIL_PATTERN,
  minSelected,
  NAME_PATTERN,
  PASSWORD_PATTERN,
  TITLE_PATTERN,
} from '../../shared/validators';

/**
 * Yeni personel kaydı formu (yalnızca Admin).
 *
 * Doğrulama kuralları backend'deki kısıtlarla aynı olacak şekilde seçilmiştir;
 * form kirliyken sayfadan çıkılırsa `unsavedChangesGuard` uyarı gösterir.
 */
@Component({
  selector: 'app-user-add',
  imports: [
    NgClass,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './user-add.html',
  styleUrl: './user-add.css',
})
export class UserAddComponent implements OnInit, CanComponentDeactivate {
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  roles: Role[] = [];
  expertiseAreas: ExpertiseArea[] = [];
  loading = false;

  readonly userForm: FormGroup = this.fb.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        Validators.pattern(NAME_PATTERN),
      ],
    ],
    title: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(TITLE_PATTERN),
      ],
    ],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(150),
        Validators.pattern(EMAIL_PATTERN),
      ],
    ],
    passwordHash: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(72),
        Validators.pattern(PASSWORD_PATTERN),
      ],
    ],
    roleId: [null, Validators.required],
    expertiseAreaIds: [[] as string[], [Validators.required, minSelected(1)]],
  });

  ngOnInit(): void {
    this.userService.getRoles().subscribe({
      next: (data) => (this.roles = data),
      error: () => this.notifyLoadFailure('Roller yüklenemedi.'),
    });

    this.userService.getExpertiseAreas().subscribe({
      next: (data) => (this.expertiseAreas = data),
      error: () => this.notifyLoadFailure('Uzmanlık alanları yüklenemedi.'),
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      // Hatalı alanların uyarı metinleri ancak "touched" olduklarında görünür.
      this.userForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Uyarı',
        detail: 'Lütfen formu eksiksiz ve kurallara uygun doldurun.',
      });
      return;
    }

    this.loading = true;
    const newUser = this.userForm.getRawValue() as CreateUserModel;

    this.userService.addUser(newUser).subscribe({
      next: (response) => {
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Başarılı',
          detail: response.message || 'Personel eklendi.',
        });
        this.userForm.reset({ expertiseAreaIds: [] });
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: err?.error?.message || 'Personel eklenirken bir hata oluştu.',
        });
      },
    });
  }

  /** `unsavedChangesGuard` sözleşmesi: kaydedilmemiş giriş varsa çıkışta onay istenir. */
  hasUnsavedChanges(): boolean {
    return this.userForm.dirty && !this.loading;
  }

  private notifyLoadFailure(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Hata', detail });
  }
}
