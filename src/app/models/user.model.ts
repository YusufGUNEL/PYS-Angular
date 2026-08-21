/** Yeni personel oluşturma isteği — POST /api/Users/AddUser */
export interface CreateUserModel {
  fullName: string;
  title: string;
  email: string;
  /** Düz metin parola; backend hash'leyerek saklar. */
  passwordHash: string;
  expertiseAreaIds: string[];
  roleId: string;
}

/** Personel güncelleme isteği — PUT /api/Users/UpdateUser */
export interface UpdateUserModel extends CreateUserModel {
  id: string;
}

/** Personel kaydı (liste ve detay yanıtları). */
export interface User {
  id: string;
  fullName: string;
  title: string;
  email: string;
  userName?: string;
  isActive: boolean;
  roleId: string;
  passwordHash?: string;
  createdAt?: string;
  updatedAt?: string | null;
  isDeleted?: boolean;
  role: Role | null;
  expertiseAreas?: ExpertiseArea[];
}

/** Yetki rolü — backend'de IdentityRole<Guid> karşılığı. */
export interface Role {
  id: string;
  name: string;
  createdAt: string;
  isDeleted: boolean;
}

/** Uzmanlık alanı (ör. "Backend", "Veri Tabanı"). */
export interface ExpertiseArea {
  id: string;
  expertiseName: string;
  createdAt: string;
  isDeleted: boolean;
}

/** Backend'in yazma uçlarında döndürdüğü ortak zarf. */
export interface ApiResponse<T> {
  message: string;
  data: T;
}
