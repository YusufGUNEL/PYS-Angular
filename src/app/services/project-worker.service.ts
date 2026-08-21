import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { ApiMessage } from '../models/api.model';
import { ProjectWorker } from '../models/project-worker.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectWorkerService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  getProjectWorkers(): Observable<ProjectWorker[]> {
    return this.http.get<ProjectWorker[]>(`${this.apiUrl}/api/ProjectWorkers/GetProjectWorkers`);
  }

  addProjectWorker(model: {
    projectId: string;
    userId: string;
    projectRole: string;
  }): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/api/ProjectWorkers/AddProjectWorker`, model);
  }

  deleteProjectWorker(id: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/api/ProjectWorkers/DeleteProjectWorker/${id}`,
    );
  }
}
