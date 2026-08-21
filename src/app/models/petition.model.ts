export interface CreatePetitionModel {
  subject: string; // kısa konu kodu, örn: 'role-change', 'other'
  title: string;
  content: string;
}

export type PetitionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PetitionDto {
  id: string;
  userId: string;
  title: string;
  subject: string;
  content: string;
  attachments: string[]; // url'ler veya dosya isimleri
  status: PetitionStatus;
  createdAt: string;
  updatedAt?: string | null;
  user?: { id: string; fullName: string; email: string } | null;
}

export interface PetitionMessage {
  id: string;
  petitionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

// Güncelleme: sunucudan mesajlar ile birlikte gelebilir
export interface PetitionWithMessages extends PetitionDto {
  messages?: PetitionMessage[];
}
