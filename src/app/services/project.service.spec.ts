import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProjectService } from './project.service';

const API = 'http://localhost:5058';

describe('ProjectService', () => {
  let service: ProjectService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('tüm projeleri getirir (admin görünümü)', () => {
    service.getProjects().subscribe();
    const req = http.expectOne(`${API}/api/Projects/GetProjects`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('kullanıcının kendi projelerini ayrı uçtan getirir', () => {
    service.getMyProjects().subscribe();
    http.expectOne(`${API}/api/Projects/MyProjects`).flush([]);
  });

  it('onay ve ret uçları boş gövdeli PUT gönderir', () => {
    service.approveProject('p1').subscribe();
    const approve = http.expectOne(`${API}/api/Projects/ApproveProject/p1`);
    expect(approve.request.method).toBe('PUT');
    expect(approve.request.body).toEqual({});
    approve.flush({ message: 'onaylandı' });

    service.rejectProject('p1').subscribe();
    const reject = http.expectOne(`${API}/api/Projects/RejectProject/p1`);
    expect(reject.request.method).toBe('PUT');
    reject.flush({ message: 'reddedildi' });
  });

  it('projeyi siler', () => {
    service.deleteProject('p1').subscribe();
    const req = http.expectOne(`${API}/api/Projects/DeleteProject/p1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'silindi' });
  });

  it('dosya yüklemeyi FormData olarak gönderir', () => {
    const file = new File(['icerik'], 'plan.pdf', { type: 'application/pdf' });

    service.uploadFile(file, 'resource').subscribe();

    const req = http.expectOne(`${API}/api/Files/Upload`);
    const body = req.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('type')).toBe('resource');
    expect((body.get('file') as File).name).toBe('plan.pdf');
    req.flush({ url: '/uploads/plan.pdf', fileName: 'plan.pdf' });
  });
});
