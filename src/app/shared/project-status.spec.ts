import { statusSeverity } from './project-status';

describe('statusSeverity', () => {
  it('bilinen durumları doğru renge eşler', () => {
    expect(statusSeverity('Devam Ediyor')).toBe('info');
    expect(statusSeverity('Tamamlandı')).toBe('success');
    expect(statusSeverity('İptal Edildi')).toBe('danger');
    expect(statusSeverity('Askıya Alındı')).toBe('warn');
  });

  it('bilinmeyen ya da boş durumda nötr renge düşer', () => {
    expect(statusSeverity('Belirsiz')).toBe('secondary');
    expect(statusSeverity(undefined)).toBe('secondary');
  });
});
