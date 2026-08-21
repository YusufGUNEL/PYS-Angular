// AuthService ve guard'ların kullandığı tipler.

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CurrentUserDto {
  id: string;
  fullName: string;
  email: string;
  title: string;
  roleId: string;
  primaryRoleName: string;
  // Çoklu uzmanlık alanı: ID listesi + eşleşen adlar (backend tek seferde ikisini de gönderir)
  expertiseAreaIds: string[];
  expertiseNames: string[];
  roles: string[];
  isAdmin: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string; // ISO date
  user: CurrentUserDto;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  title: string;
  email: string;
  // null/boş gelirse backend uzmanlık alanlarını değiştirmez
  expertiseAreaIds?: string[];
}

/**
 * Kullanıcının Admin olup olmadığını tek bir yerden belirler.
 *
 * Backend sürümüne göre rol bilgisi üç ayrı alandan gelebiliyor
 * (`primaryRoleName`, `roles[]`, `isAdmin`); bunları tek kurala indirger ki
 * navbar, guard'lar ve giriş sonrası yönlendirme aynı sonucu üretsin.
 */
export function isAdminUser(user: CurrentUserDto | null | undefined): boolean {
  if (!user) return false;

  const roleNames = [user.primaryRoleName, ...(user.roles ?? [])].filter(
    (role): role is string => !!role && role.trim().length > 0,
  );

  if (roleNames.length > 0) {
    return roleNames.some((role) => role.trim().toLowerCase() === 'admin');
  }

  return user.isAdmin === true;
}
