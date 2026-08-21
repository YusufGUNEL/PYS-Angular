import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { LoginComponent } from './login';
import { AuthService } from '../../services/auth.service';
import { CurrentUserDto, LoginResponse } from '../../models/auth.model';

const BASE_USER: CurrentUserDto = {
  id: 'u1',
  fullName: 'Test',
  email: 'test@pys.local',
  title: 'Geliştirici',
  roleId: 'r1',
  primaryRoleName: 'User',
  expertiseAreaIds: [],
  expertiseNames: [],
  roles: ['User'],
  isAdmin: false,
};

function response(user: Partial<CurrentUserDto>): LoginResponse {
  return {
    token: 'jwt',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    user: { ...BASE_USER, ...user },
  };
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let login: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    login = vi.fn().mockReturnValue(of(response({})));
    navigate = vi.fn();
    addMessage = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: { login } },
        { provide: Router, useValue: { navigate } },
      ],
    })
      .overrideComponent(LoginComponent, {
        set: { providers: [{ provide: MessageService, useValue: { add: addMessage } }] },
      })
      .compileComponents();

    component = TestBed.createComponent(LoginComponent).componentInstance;
  });

  it('form başlangıçta geçersizdir', () => {
    expect(component.form.valid).toBe(false);
  });

  it('geçersiz e-posta reddedilir', () => {
    component.form.patchValue({ email: 'gecersiz', password: 'sifre123' });
    expect(component.form.get('email')?.valid).toBe(false);
  });

  it('kısa şifre reddedilir', () => {
    component.form.patchValue({ email: 'a@b.com', password: '123' });
    expect(component.form.get('password')?.valid).toBe(false);
  });

  it('geçerli değerlerle form geçerlidir', () => {
    component.form.patchValue({ email: 'admin@pys.local', password: 'Admin123!' });
    expect(component.form.valid).toBe(true);
  });

  it('geçersiz formda istek atmaz, uyarı gösterir', () => {
    component.onSubmit();

    expect(login).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
    expect(component.form.get('email')?.touched).toBe(true);
  });

  it('admin girişinde personel ekranına yönlendirir', () => {
    login.mockReturnValue(
      of(response({ primaryRoleName: 'Admin', roles: ['Admin'], isAdmin: true })),
    );
    component.form.patchValue({ email: 'admin@pys.local', password: 'Admin123!' });

    component.onSubmit();

    expect(navigate).toHaveBeenCalledWith(['/users']);
    expect(component.loading).toBe(false);
  });

  it('isAdmin bayrağı olmasa da rol adı Admin ise yönetim ekranına gider', () => {
    // Backend yalnızca rol adı döndürdüğünde de yönlendirme doğru olmalı.
    login.mockReturnValue(of(response({ primaryRoleName: 'Admin', roles: [], isAdmin: false })));
    component.form.patchValue({ email: 'admin@pys.local', password: 'Admin123!' });

    component.onSubmit();

    expect(navigate).toHaveBeenCalledWith(['/users']);
  });

  it('personel girişinde proje listesine yönlendirir', () => {
    component.form.patchValue({ email: 'personel@pys.local', password: 'sifre123' });

    component.onSubmit();

    expect(navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('hata durumunda sunucu mesajını gösterir ve yüklemeyi kapatır', () => {
    login.mockReturnValue(throwError(() => ({ error: { message: 'Şifre hatalı.' } })));
    component.form.patchValue({ email: 'admin@pys.local', password: 'Admin123!' });

    component.onSubmit();

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Şifre hatalı.' }),
    );
    expect(component.loading).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
