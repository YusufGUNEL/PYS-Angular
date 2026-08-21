import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectDocument, AddProjectDocumentModel } from '../models/project.model';
import { environment } from '../environments/environment';
import { ApiMessage } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ProjectDocumentService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  // Tüm proje dokümanlarını getir.
  getAll(): Observable<ProjectDocument[]> {
    return this.http.get<ProjectDocument[]>(
      `${this.apiUrl}/api/ProjectDocuments/GetProjectDocuments`,
    );
  }

  // Belirli bir projeye ait dokümanları getir.
  getByProjectId(projectId: string): Observable<ProjectDocument[]> {
    return this.http.get<ProjectDocument[]>(
      `${this.apiUrl}/api/ProjectDocuments/GetByProjectId/${projectId}`,
    );
  }

  // Yeni doküman ekle (önce dosya yüklenir, dönen URL ile bu çağrılır).
  add(model: AddProjectDocumentModel): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(
      `${this.apiUrl}/api/ProjectDocuments/AddProjectDocument`,
      model,
    );
  }

  // Doküman sil (soft delete).
  delete(id: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/api/ProjectDocuments/DeleteProjectDocument/${id}`,
    );
  }
}
