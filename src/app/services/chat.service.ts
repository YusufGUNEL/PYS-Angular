import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../environments/environment';
import { ApiMessage } from '../models/api.model';
import { AuthService } from './auth.service';
import {
  AddMemberRequest,
  ChatDirectoryUser,
  ChatMessage,
  ChatRoom,
  CreateDirectRoomRequest,
  CreateGroupRequest,
  MessageReadEvent,
  SendChatMessageRequest,
  TypingEvent,
} from '../models/chat.model';

/**
 * ChatService — PYS sohbet modülünün tek giriş noktası.
 *
 * Sorumluluklar:
 *   - REST: oda listele, oda yarat (bireysel/grup), üye ekle-çıkar, mesaj geçmişi çek, okundu işaretle
 *   - SignalR: HubConnection kurma, otomatik yeniden bağlanma, server-side event'leri Subject'lere yayma
 *
 * Tüketici component'lar `messages$`, `typing$`, `messageRead$` Subject'lerine subscribe olur.
 * Connection state'i `connectionState` Angular signal'i üzerinden okunur.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly apiUrl = environment.apiUrl;
  private hub?: signalR.HubConnection;

  /** SignalR connection state — UI gösterimi için */
  readonly connectionState = signal<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected,
  );

  /** Server'dan gelen yeni mesajlar — component'lar buna subscribe olur */
  readonly messages$ = new Subject<ChatMessage>();
  readonly typing$ = new Subject<TypingEvent>();
  readonly messageRead$ = new Subject<MessageReadEvent>();

  // ─── SignalR ───────────────────────────────────────────────────────────

  /** Hub'a bağlan. Daha önce bağlanmışsa idempotent. */
  async start(): Promise<void> {
    if (this.hub && this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrl}/hubs/chat`, {
        // Bearer header WebSocket'te gönderilemez; SignalR access_token query param ile gönderir.
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('MessageReceived', (msg: ChatMessage) => this.messages$.next(msg));
    this.hub.on('Typing', (ev: TypingEvent) => this.typing$.next(ev));
    this.hub.on('MessageRead', (ev: MessageReadEvent) => this.messageRead$.next(ev));

    this.hub.onreconnecting(() =>
      this.connectionState.set(signalR.HubConnectionState.Reconnecting),
    );
    this.hub.onreconnected(() => this.connectionState.set(signalR.HubConnectionState.Connected));
    this.hub.onclose(() => this.connectionState.set(signalR.HubConnectionState.Disconnected));

    this.connectionState.set(signalR.HubConnectionState.Connecting);
    await this.hub.start();
    this.connectionState.set(signalR.HubConnectionState.Connected);
  }

  async stop(): Promise<void> {
    if (this.hub) {
      await this.hub.stop();
      this.connectionState.set(signalR.HubConnectionState.Disconnected);
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) return;
    await this.hub.invoke('JoinRoom', roomId);
  }

  async sendMessage(req: SendChatMessageRequest): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Bağlantı kurulmadı.');
    }
    await this.hub.invoke('SendMessage', req);
  }

  async sendTyping(roomId: string): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.hub.invoke('Typing', roomId);
    } catch {
      /* yok say */
    }
  }

  async markAsRead(roomId: string): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.hub.invoke('MarkAsRead', roomId);
    } catch {
      /* yok say */
    }
  }

  // ─── REST ──────────────────────────────────────────────────────────────

  /** Sohbet picker için minimal personel listesi — UsersController.GetUsers Admin-only
   *  olduğundan ayrı bir endpoint (ChatRooms/users) kullanıyoruz. */
  getDirectory(): Observable<ChatDirectoryUser[]> {
    return this.http.get<ChatDirectoryUser[]>(`${this.apiUrl}/api/ChatRooms/users`);
  }

  getRooms(): Observable<ChatRoom[]> {
    return this.http.get<ChatRoom[]>(`${this.apiUrl}/api/ChatRooms`);
  }

  getRoom(id: string): Observable<ChatRoom> {
    return this.http.get<ChatRoom>(`${this.apiUrl}/api/ChatRooms/${id}`);
  }

  getOrCreateDirect(req: CreateDirectRoomRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.apiUrl}/api/ChatRooms/direct`, req);
  }

  createGroup(req: CreateGroupRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.apiUrl}/api/ChatRooms/group`, req);
  }

  addMember(roomId: string, req: AddMemberRequest): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/api/ChatRooms/${roomId}/members`, req);
  }

  removeMember(roomId: string, userId: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/api/ChatRooms/${roomId}/members/${userId}`);
  }

  getMessages(roomId: string, before?: string, take = 50): Observable<ChatMessage[]> {
    let params = new HttpParams().set('roomId', roomId).set('take', String(take));
    if (before) params = params.set('before', before);
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/api/ChatMessages`, { params });
  }

  deleteMessage(id: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/api/ChatMessages/${id}`);
  }
}
