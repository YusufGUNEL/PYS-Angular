import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { ApiMessage } from '../models/api.model';
import { PetitionDto, PetitionMessage } from '../models/petition.model';

@Injectable({ providedIn: 'root' })
export class PetitionService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  createPetition(formData: FormData): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/api/Petitions/Add`, formData);
  }

  getUserPetitions(): Observable<PetitionDto[]> {
    return this.http.get<PetitionDto[]>(`${this.apiUrl}/api/Petitions/GetByUser`);
  }

  getAllPetitions(status?: string): Observable<PetitionDto[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<PetitionDto[]>(`${this.apiUrl}/api/Petitions/GetAll${q}`);
  }

  approvePetition(id: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/Petitions/Approve/${id}`, {});
  }

  rejectPetition(id: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/api/Petitions/Reject/${id}`, {});
  }

  // Mesajlaşma / yorumlar
  getMessages(petitionId: string): Observable<PetitionMessage[]> {
    return this.http.get<PetitionMessage[]>(
      `${this.apiUrl}/api/Petitions/GetMessages/${petitionId}`,
    );
  }

  addMessage(petitionId: string, content: string): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/api/Petitions/AddMessage`, {
      petitionId,
      content,
    });
  }
}
