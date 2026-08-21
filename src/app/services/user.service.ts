import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import {
  ApiResponse,
  CreateUserModel,
  ExpertiseArea,
  Role,
  UpdateUserModel,
  User,
} from '../models/user.model';
import { AuthService } from './auth.service';

/**
 * Personel, rol ve uzmanlık alanı uçlarını saran servis.
 * Listeleme/ekleme/silme uçları backend'de yalnızca Admin'e açıktır.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/Roles/GetRoles */
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/api/Roles/GetRoles`);
  }

  /** GET /api/ExpertiseAreas/GetExpertiseAreas */
  getExpertiseAreas(): Observable<ExpertiseArea[]> {
    return this.http.get<ExpertiseArea[]>(`${this.apiUrl}/api/ExpertiseAreas/GetExpertiseAreas`);
  }

  /** GET /api/Users/GetUsers */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/api/Users/GetUsers`);
  }

  /** POST /api/Users/AddUser */
  addUser(model: CreateUserModel): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/api/Users/AddUser`, model);
  }

  /**
   * PUT /api/Users/UpdateUser
   *
   * Admin olmayan bir kullanıcı kendi kaydını güncellerken `roleId` alanı,
   * istek gövdesine dokunulmuş olsa bile mevcut rolüne sabitlenir.
   * Bu yalnızca ilk savunma hattıdır; yetki kontrolünün asıl yeri backend'dir.
   */
  updateUser(model: UpdateUserModel): Observable<ApiResponse<User>> {
    const current = this.auth.currentUser();
    const payload: UpdateUserModel =
      !this.auth.isAdmin() && current ? { ...model, roleId: current.roleId } : model;

    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/api/Users/UpdateUser`, payload);
  }

  /** DELETE /api/Users/DeleteUser/{id} — backend tarafında soft delete. */
  deleteUser(id: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/api/Users/DeleteUser/${id}`);
  }
}
