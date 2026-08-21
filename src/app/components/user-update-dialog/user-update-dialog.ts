import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';

import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

import { User, UpdateUserModel, Role, ExpertiseArea } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { EMAIL_PATTERN, minSelected, NAME_PATTERN, TITLE_PATTERN } from '../../shared/validators';

@Component({
  selector: 'app-user-update-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    ButtonModule,
  ],
  templateUrl: './user-update-dialog.html',
})
export class UserUpdateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  config = inject(DynamicDialogConfig);
  ref = inject(DynamicDialogRef);
  auth = inject(AuthService);

  user: User | null = null;
  roles: Role[] = [];
  expertiseAreas: ExpertiseArea[] = [];

  form: FormGroup;
  saving = false;

  constructor() {
    this.form = this.fb.group({
      id: [''],
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
      // Şifre opsiyonel (boş bırakılırsa değişmez). Yazılmışsa kompleksite uygulanır:
      // - 6-72 karakter
      // - en az bir harf VE bir rakam
      // Boş string için alternation ile geçerli sayılır.
      passwordHash: [
        '',
        [
          Validators.minLength(6),
          Validators.maxLength(72),
          Validators.pattern(/(?:$|(?=.*[A-Za-z])(?=.*\d).{6,72})/),
        ],
      ],
      roleId: [null, Validators.required],
      expertiseAreaIds: [[] as string[], [Validators.required, minSelected(1)]],
    });
  }

  ngOnInit(): void {
    if (this.config.data) {
      this.user = this.config.data.user;
      this.roles = this.config.data.roles || [];
      this.expertiseAreas = this.config.data.expertiseAreas || [];

      if (this.user) {
        const currentExpertiseIds = (this.user.expertiseAreas ?? []).map((e) => e.id);
        this.form.patchValue({
          id: this.user.id,
          fullName: this.user.fullName,
          title: this.user.title,
          email: this.user.email,
          passwordHash: '',
          roleId: this.user.roleId,
          expertiseAreaIds: currentExpertiseIds,
        });
        // Eğer işlem yapan admin değilse rol alanını devre dışı bırak (frontend ekstra güvenlik)
        if (!this.auth.isAdmin()) {
          this.form.get('roleId')?.disable();
        }
      }
    }
  }

  closeModal(): void {
    this.ref.close(false);
  }

  onUpdate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Uyarı',
        detail: 'Lütfen formu eksiksiz doldurun.',
      });
      return;
    }

    this.saving = true;
    const updatedData: UpdateUserModel = this.form.getRawValue();
    // Eğer işlem yapan kişi admin değilse rol değişikliğine izin verme (sunucu tarafı da kontrol etmeli)
    if (!this.auth.isAdmin()) {
      updatedData.roleId = this.user?.roleId || updatedData.roleId;
    }

    this.userService.updateUser(updatedData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Başarılı',
          detail: 'Kullanıcı güncellendi.',
        });
        this.saving = false;
        this.ref.close(true);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Güncelleme başarısız.',
        });
        this.saving = false;
      },
    });
  }
}
