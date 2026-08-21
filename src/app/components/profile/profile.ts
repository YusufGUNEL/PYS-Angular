import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ExpertiseArea } from '../../models/user.model';
import { Router } from '@angular/router';
import {
  EMAIL_PATTERN,
  minSelected,
  NAME_PATTERN,
  PASSWORD_PATTERN,
  TITLE_PATTERN,
} from '../../shared/validators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  loading = true;
  saving = false;
  expertiseAreas: ExpertiseArea[] = [];

  form!: FormGroup;
  passwordForm!: FormGroup;
  changingPassword = false;

  constructor() {
    this.form = this.fb.group({
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
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
      expertiseAreaIds: [[] as string[], [Validators.required, minSelected(1)]],
    });

    this.passwordForm = this.fb.group({
      currentPassword: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(72)],
      ],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(72),
          Validators.pattern(PASSWORD_PATTERN),
        ],
      ],
      confirmPassword: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(72)],
      ],
    });
  }

  ngOnInit(): void {
    // İlk ekranda gecikmeyi azaltmak için local cache'teki user bilgisini
    // hemen kullanıp formu dolduruyoruz. Arka planda ise fetchMe() ile
    // güncelleme yapıyoruz (görünürlük anında iyileşir).
    this.userService.getExpertiseAreas().subscribe({
      next: (areas) => {
        this.expertiseAreas = areas ?? [];
        // Seçenekler geldikten sonra form değerini tekrar set et ki multi-select eşleşen chip'leri göstersin
        const currentVal = this.form.get('expertiseAreaIds')?.value as string[] | undefined;
        if (currentVal && currentVal.length) {
          this.form.patchValue({ expertiseAreaIds: currentVal });
        }
      },
      error: () => {
        this.expertiseAreas = [];
      },
    });

    const cached = this.auth.currentUser();
    if (cached) {
      this.form.patchValue({
        fullName: cached.fullName,
        title: cached.title,
        email: cached.email,
        expertiseAreaIds: cached.expertiseAreaIds ?? [],
      });
      this.applyAccess();
      this.loading = false; // hemen göster
    }

    // Arka planda server'dan taze kullanıcı bilgisini çek ve formu yenile.
    this.auth.fetchMe().subscribe({
      next: (me) => {
        this.form.patchValue({
          fullName: me.fullName,
          title: me.title,
          email: me.email,
          expertiseAreaIds: me.expertiseAreaIds ?? [],
        });
        this.applyAccess();
        this.loading = false;
      },
      error: () => {
        this.applyAccess();
        this.loading = false;
      },
    });
  }

  private applyAccess(): void {
    if (this.auth.isAdmin()) {
      this.form.enable({ emitEvent: false });
      this.passwordForm.enable({ emitEvent: false });
      return;
    }

    this.form.disable({ emitEvent: false });
    this.passwordForm.disable({ emitEvent: false });
  }

  requestProfileChange(): void {
    // Kullanıcıyı kendi dilekçe sayfasına yönlendirip popup açmasını sağla
    this.router.navigate(['/my-petitions'], { queryParams: { openCreate: 1 } });
  }

  save(): void {
    if (!this.auth.isAdmin()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Yetkisiz',
        detail: 'Profil değişikliği için dilekçe gönderin.',
      });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.form.getRawValue();
    this.auth
      .updateProfile({
        fullName: payload.fullName!,
        title: payload.title!,
        email: payload.email!,
        expertiseAreaIds: (payload.expertiseAreaIds as string[]) ?? [],
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Profil güncellendi.',
          });
          this.auth.fetchMe().subscribe();
        },
        error: (err) => {
          this.saving = false;
          const detail = err?.error?.message || 'Profil güncellenemedi.';
          this.messageService.add({ severity: 'error', summary: 'Hata', detail });
        },
      });
  }

  changePassword(): void {
    if (!this.auth.isAdmin()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Yetkisiz',
        detail: 'Şifre değişikliği için yönetici yetkisi gerekir.',
      });
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Uyarı',
        detail: 'Yeni şifreler eşleşmiyor.',
      });
      return;
    }

    this.changingPassword = true;
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.changingPassword = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Başarılı',
          detail: 'Şifre değiştirildi.',
        });
        this.passwordForm.reset();
      },
      error: (err) => {
        this.changingPassword = false;
        const detail = err?.error?.message || 'Şifre değiştirilemedi.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      },
    });
  }
}
