import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Project,
  AddProjectModel,
  UpdateProjectModel,
  ProjectStatus,
} from '../models/project.model';
import { environment } from '../environments/environment';
import { ApiMessage, CreatedResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  // Projeleri getir
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/api/Projects/GetProjects`);
  }

  // Kullanıcının dahil olduğu projeler
  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/api/Projects/MyProjects`);
  }

  // Yeni Proje Ekle
  addProject(project: AddProjectModel): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(`${this.apiUrl}/api/Projects/AddProject`, project);
  }

  // Projeyi Güncelle
  updateProject(project: UpdateProjectModel): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/Projects/UpdateProject`, project);
  }

  // Projeyi Sil (soft delete)
  deleteProject(id: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/api/Projects/DeleteProject/${id}`);
  }

  approveProject(id: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/Projects/ApproveProject/${id}`, {});
  }

  rejectProject(id: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/Projects/RejectProject/${id}`, {});
  }

  // Proje Durumlarını Getir
  getProjectStatuses(): Observable<ProjectStatus[]> {
    return this.http.get<ProjectStatus[]>(`${this.apiUrl}/api/ProjectStatuses/GetProjectStatuses`);
  }

  // Dosya yükle (kapak görseli veya kaynak dosya). type: 'image' | 'resource'
  uploadFile(
    file: File,
    type: 'image' | 'resource',
  ): Observable<{ url: string; fileName: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return this.http.post<{ url: string; fileName: string }>(
      `${this.apiUrl}/api/Files/Upload`,
      form,
    );
  }
}
