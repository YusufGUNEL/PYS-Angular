import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: { getToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { getToken: vi.fn().mockReturnValue(null), logout: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('token varsa Authorization başlığı ekler', () => {
    auth.getToken.mockReturnValue('jwt-123');

    http.get('/api/Projects').subscribe();

    const req = httpMock.expectOne('/api/Projects');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush({});
  });

  it('token yoksa başlık eklemez', () => {
    http.get('/api/Projects').subscribe();

    const req = httpMock.expectOne('/api/Projects');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('401 yanıtında oturumu kapatır ve hatayı iletir', () => {
    auth.getToken.mockReturnValue('süresi-dolmuş');
    let caught: number | undefined;

    http.get('/api/Projects').subscribe({ error: (err) => (caught = err.status) });

    httpMock
      .expectOne('/api/Projects')
      .flush('Yetkisiz', { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalledWith(true);
    expect(caught).toBe(401);
  });

  it('401 dışındaki hatalarda oturumu kapatmaz', () => {
    auth.getToken.mockReturnValue('jwt-123');

    http.get('/api/Projects').subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/Projects')
      .flush('Sunucu hatası', { status: 500, statusText: 'Server Error' });

    expect(auth.logout).not.toHaveBeenCalled();
  });
});
