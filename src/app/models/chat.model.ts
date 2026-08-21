// PYS Chat modülü için TypeScript tipleri (backend DTO'larıyla 1-1 eşleşir).

export interface ChatRoomMember {
  userId: string;
  fullName: string;
  title: string;
  role: 'admin' | 'member' | string;
  lastReadAt: string; // ISO
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string; // ISO
}

export interface ChatRoom {
  id: string;
  name?: string | null;
  isGroup: boolean;
  createdById: string;
  createdAt: string;
  members: ChatRoomMember[];
  lastMessage?: ChatMessage | null;
  unreadCount: number;
}

export interface CreateDirectRoomRequest {
  otherUserId: string;
}

export interface CreateGroupRequest {
  name: string;
  memberIds: string[];
}

export interface SendChatMessageRequest {
  roomId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface AddMemberRequest {
  userId: string;
  role: 'admin' | 'member';
}

export interface TypingEvent {
  roomId: string;
  userId: string;
  fullName: string;
}

export interface MessageReadEvent {
  roomId: string;
  userId: string;
  at: string;
}

/**
 * `GET /api/ChatRooms/users` yanıtı — sohbet başlatma listesi için minimal personel kaydı.
 * Tam `User` modeli değildir: Users/GetUsers yalnızca Admin'e açık olduğundan
 * sohbet ekranı bu daraltılmış uçtan beslenir.
 */
export interface ChatDirectoryUser {
  id: string;
  fullName: string;
  title: string;
}
