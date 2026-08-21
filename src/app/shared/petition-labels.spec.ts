import { petitionStatusLabel, petitionSubjectLabel } from './petition-labels';

describe('petitionStatusLabel', () => {
  it('durum kodlarını Türkçeye çevirir', () => {
    expect(petitionStatusLabel('Pending')).toBe('Beklemede');
    expect(petitionStatusLabel('Approved')).toBe('Onaylandı');
    expect(petitionStatusLabel('Rejected')).toBe('Reddedildi');
  });

  it('bilinmeyen durumu olduğu gibi bırakır', () => {
    expect(petitionStatusLabel('Archived')).toBe('Archived');
  });

  it('boş değerde boş metin döner', () => {
    expect(petitionStatusLabel(undefined)).toBe('');
  });
});

describe('petitionSubjectLabel', () => {
  it('konu kodlarını Türkçeye çevirir', () => {
    expect(petitionSubjectLabel('role-change')).toBe('Rol Değişikliği');
    expect(petitionSubjectLabel('general')).toBe('Genel İstek');
    expect(petitionSubjectLabel('other')).toBe('Diğer');
  });

  it('büyük harfli koda da çalışır', () => {
    expect(petitionSubjectLabel('ROLE-CHANGE')).toBe('Rol Değişikliği');
  });

  it('bilinmeyen konuyu olduğu gibi bırakır', () => {
    expect(petitionSubjectLabel('izin')).toBe('izin');
  });

  it('boş değerde boş metin döner', () => {
    expect(petitionSubjectLabel('')).toBe('');
    expect(petitionSubjectLabel(undefined)).toBe('');
  });
});
