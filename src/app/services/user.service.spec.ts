import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { CurrentUserDto } from '../models/auth.model';
import { UpdateUserModel } from '../models/user.model';

const API = 'http://localhost:5058';

const CURRENT: CurrentUserDto = {
  id: 'u-staff',
  fullName: 'Personel',
  email: 'personel@pys.local',
  title: 'Geliştirici',
  roleId: 'rol-personel',
  primaryRoleName: 'User',
  expertiseAreaIds: [],
  expertiseNames: [],
  roles: ['User'],
  isAdmin: false,
};

const PAYLOAD: UpdateUserModel = {
  id: 'u-staff',
  fullName: 'Personel',
  title: 'Geliştirici',
  email: 'personel@pys.local',
  passwordHash: '',
  expertiseAreaIds: ['e1'],
  roleId: 'rol-admin', // kurcalanmış rol
};

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;
  let isAdmin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isAdmin = vi.fn().mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAdmin, currentUser: () => CURRENT } },
      ],
    });

    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('kullanıcıları listeler', () => {
    service.getUsers().subscribe();
    const req = http.expectOne(`${API}/api/Users/GetUsers`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('admin olmayan istekte roleId mevcut role sabitlenir', () => {
    service.updateUser({ ...PAYLOAD }).subscribe();

    const req = http.expectOne(`${API}/api/Users/UpdateUser`);
    expect(req.request.body.roleId).toBe('rol-personel');
    req.flush({ message: 'ok', data: {} });
  });

  it('roleId sabitlenirken çağıranın nesnesi değiştirilmez', () => {
    const payload = { ...PAYLOAD };
    service.updateUser(payload).subscribe();

    http.expectOne(`${API}/api/Users/UpdateUser`).flush({ message: 'ok', data: {} });
    expect(payload.roleId).toBe('rol-admin');
  });

  it('admin istekte roleId olduğu gibi gönderilir', () => {
    isAdmin.mockReturnValue(true);
    service.updateUser({ ...PAYLOAD }).subscribe();

    const req = http.expectOne(`${API}/api/Users/UpdateUser`);
    expect(req.request.body.roleId).toBe('rol-admin');
    req.flush({ message: 'ok', data: {} });
  });

  it('kullanıcı siler', () => {
    service.deleteUser('u-1').subscribe();
    const req = http.expectOne(`${API}/api/Users/DeleteUser/u-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'silindi', data: null });
  });
});
