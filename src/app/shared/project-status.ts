/** PrimeNG `p-tag` bileşeninin kabul ettiği renk anahtarları. */
export type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const STATUS_SEVERITY: Record<string, TagSeverity> = {
  'Devam Ediyor': 'info',
  Tamamlandı: 'success',
  Planlanıyor: 'secondary',
  'İptal Edildi': 'danger',
  'Askıya Alındı': 'warn',
};

/**
 * Proje durum adını etiket rengine çevirir.
 * Bilinmeyen ya da boş durumlar nötr (secondary) gösterilir.
 */
export function statusSeverity(statusName?: string): TagSeverity {
  return STATUS_SEVERITY[statusName ?? ''] ?? 'secondary';
}
