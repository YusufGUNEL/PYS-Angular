import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { isAdminUser } from '../../models/auth.model';
import { EMAIL_PATTERN } from '../../shared/validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './login.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  loading = false;

  form!: FormGroup;
  showPassword = false;

  constructor() {
    this.form = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(150),
          Validators.pattern(EMAIL_PATTERN),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Uyarı',
        detail: 'Lütfen tüm alanları doldurun.',
      });
      return;
    }

    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        this.loading = false;
        // Rol bazlı yönlendirme: admin yönetim ekranına, personel proje listesine.
        // isAdminUser(): navbar ve guard'larla aynı kuralı kullanır.
        this.router.navigate([isAdminUser(res?.user) ? '/users' : '/projects']);
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.message || 'Giriş başarısız.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      },
    });
  }
}
