import { PetitionStatus } from '../models/petition.model';

/** Dilekçe durumlarının Türkçe karşılıkları — arayüzde ham İngilizce kod gösterilmez. */
const STATUS_LABELS: Record<PetitionStatus, string> = {
  Pending: 'Beklemede',
  Approved: 'Onaylandı',
  Rejected: 'Reddedildi',
};

/** Dilekçe konu kodlarının Türkçe karşılıkları (form ile aynı liste). */
const SUBJECT_LABELS: Record<string, string> = {
  'role-change': 'Rol Değişikliği',
  general: 'Genel İstek',
  other: 'Diğer',
};

export function petitionStatusLabel(status?: string): string {
  return STATUS_LABELS[status as PetitionStatus] ?? status ?? '';
}

export function petitionSubjectLabel(subject?: string): string {
  if (!subject) return '';
  return SUBJECT_LABELS[subject.toLowerCase()] ?? subject;
}
