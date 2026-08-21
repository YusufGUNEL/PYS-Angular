import { CurrentUserDto, isAdminUser } from './auth.model';

function user(partial: Partial<CurrentUserDto>): CurrentUserDto {
  return {
    id: 'u1',
    fullName: 'Test Kullanıcı',
    email: 'test@pys.local',
    title: 'Geliştirici',
    roleId: 'r1',
    primaryRoleName: '',
    expertiseAreaIds: [],
    expertiseNames: [],
    roles: [],
    isAdmin: false,
    ...partial,
  };
}

describe('isAdminUser', () => {
  it('kullanıcı yoksa false döner', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it('primaryRoleName Admin ise true döner', () => {
    expect(isAdminUser(user({ primaryRoleName: 'Admin' }))).toBe(true);
  });

  it('rol adını büyük/küçük harf ve boşluktan bağımsız değerlendirir', () => {
    expect(isAdminUser(user({ primaryRoleName: '  aDmIn ' }))).toBe(true);
  });

  it('roles dizisinde Admin varsa true döner', () => {
    expect(isAdminUser(user({ roles: ['User', 'Admin'] }))).toBe(true);
  });

  it('rol bilgisi varken isAdmin bayrağını dikkate almaz', () => {
    // Sunucu rol adı gönderiyorsa yetki kaynağı odur; eski isAdmin alanı yanıltmamalı.
    expect(isAdminUser(user({ primaryRoleName: 'User', isAdmin: true }))).toBe(false);
  });

  it('hiç rol adı yoksa isAdmin bayrağına düşer', () => {
    expect(isAdminUser(user({ primaryRoleName: '', roles: [], isAdmin: true }))).toBe(true);
    expect(isAdminUser(user({ primaryRoleName: '', roles: [], isAdmin: false }))).toBe(false);
  });

  it('roles alanı tanımsız gelirse çökmez', () => {
    const incomplete = { ...user({}), roles: undefined } as unknown as CurrentUserDto;
    expect(isAdminUser(incomplete)).toBe(false);
  });
});
