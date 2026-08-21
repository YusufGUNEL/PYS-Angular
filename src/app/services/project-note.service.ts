import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { ApiMessage } from '../models/api.model';

export interface ProjectNoteDto {
  id: string;
  content: string;
  projectId: string;
  userId: string;
  createdAt: string;
}

export interface ProjectNoteCreateModel {
  projectId: string;
  content: string;
}

export interface ProjectNoteUpdateModel {
  id: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectNoteService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  getByProjectId(projectId: string): Observable<ProjectNoteDto[]> {
    return this.http.get<ProjectNoteDto[]>(
      `${this.apiUrl}/api/ProjectNotes/GetByProjectId/${projectId}`,
    );
  }

  add(model: ProjectNoteCreateModel): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/api/ProjectNotes/AddProjectNote`, model);
  }

  update(model: ProjectNoteUpdateModel): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/ProjectNotes/UpdateProjectNote`, model);
  }

  delete(id: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/api/ProjectNotes/DeleteProjectNote/${id}`);
  }
}
