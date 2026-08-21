import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  AfterViewChecked,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject, takeUntil } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatDirectoryUser, ChatMessage, ChatRoom } from '../../models/chat.model';
import { NewGroupDialogComponent } from '../new-group-dialog/new-group-dialog';

/**
 * Tek-sayfa chat UI:
 *   - Sol panel: oda listesi (bireysel + grup) + arama + yeni sohbet/grup butonları
 *   - Sağ panel: seçili odanın mesajları, yazma kutusu, "yazıyor..." göstergesi
 *
 * Yeni mesajlar `ChatService.messages$` Subject'i üzerinden gelir; component
 * her oda için lokal mesaj cache'i tutar ki kullanıcı odalar arası geçişte yeniden fetch yapmasın.
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    TagModule,
    DatePipe,
  ],
  providers: [MessageService, DialogService],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  auth = inject(AuthService);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('messagesEnd') private messagesEnd?: ElementRef<HTMLDivElement>;

  rooms: ChatRoom[] = [];
  filteredRooms: ChatRoom[] = [];
  roomSearch = '';
  loadingRooms = true;

  selectedRoom: ChatRoom | null = null;
  messages: ChatMessage[] = [];
  loadingMessages = false;
  messageInput = '';

  /** roomId -> "Ali yazıyor..." vb. */
  typingByRoom: Record<string, { name: string; expiresAt: number }> = {};
  private typingTimer?: ReturnType<typeof setInterval>;

  /** Sohbet başlatılabilecek personel listesi — "Yeni Sohbet" paneli için. */
  users: ChatDirectoryUser[] = [];
  showStartChatPanel = false;
  startChatSearch = '';

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  // ─── lifecycle ──────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    // 1) SignalR bağlantısını aç
    try {
      await this.chatService.start();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Hata',
        detail: 'Sohbet bağlantısı kurulamadı.',
      });
    }

    // 2) Server'dan mesaj geldikçe ilgili odaya ekle
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => this.onIncomingMessage(msg));
    this.chatService.typing$.pipe(takeUntil(this.destroy$)).subscribe((ev) => {
      this.typingByRoom[ev.roomId] = { name: ev.fullName, expiresAt: Date.now() + 4000 };
      this.cdr.detectChanges();
    });

    // 3) "Yazıyor" timeout temizleyici
    this.typingTimer = setInterval(() => {
      const now = Date.now();
      let dirty = false;
      for (const [rid, ev] of Object.entries(this.typingByRoom)) {
        if (ev.expiresAt < now) {
          delete this.typingByRoom[rid];
          dirty = true;
        }
      }
      if (dirty) this.cdr.detectChanges();
    }, 1000);

    // 4) Oda listesini yükle
    this.loadRooms();

    // 5) Kullanıcı listesi — yeni sohbet için
    this.chatService.getDirectory().subscribe({
      // ChatRooms/users kendi kaydımı zaten filtreliyor.
      next: (data) => {
        this.users = data ?? [];
      },
      error: () => {
        /* hata olunca panel kapalı kalır, kullanıcı tekrar deneyebilir */
      },
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.messagesEnd) {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'auto', block: 'end' });
      this.shouldScrollToBottom = false;
    }
  }

  async ngOnDestroy(): Promise<void> {
    if (this.typingTimer) clearInterval(this.typingTimer);
    this.destroy$.next();
    this.destroy$.complete();
    await this.chatService.stop();
  }

  // ─── data ───────────────────────────────────────────────────────────────

  loadRooms(): void {
    this.loadingRooms = true;
    this.chatService.getRooms().subscribe({
      next: (data) => {
        this.rooms = data || [];
        this.applyRoomFilter();
        this.loadingRooms = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingRooms = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Odalar yüklenemedi.',
        });
        this.cdr.detectChanges();
      },
    });
  }

  applyRoomFilter(): void {
    const q = (this.roomSearch || '').trim().toLocaleLowerCase('tr-TR');
    if (!q) {
      this.filteredRooms = [...this.rooms];
      return;
    }
    this.filteredRooms = this.rooms.filter((r) =>
      (this.roomDisplayName(r) || '').toLocaleLowerCase('tr-TR').includes(q),
    );
  }

  async selectRoom(room: ChatRoom): Promise<void> {
    if (this.selectedRoom?.id === room.id) return;
    this.selectedRoom = room;
    this.messages = [];
    this.loadingMessages = true;
    this.cdr.detectChanges();

    // Server'a join (yeni katıldığım odalarda gerekli; mevcutsa idempotent)
    try {
      await this.chatService.joinRoom(room.id);
    } catch {
      /* yok say */
    }

    this.chatService.getMessages(room.id, undefined, 50).subscribe({
      next: (data) => {
        this.messages = data || [];
        this.loadingMessages = false;
        this.shouldScrollToBottom = true;
        // Okundu işaretle (lokal unread count'u sıfırla)
        room.unreadCount = 0;
        this.chatService.markAsRead(room.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMessages = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Mesajlar yüklenemedi.',
        });
        this.cdr.detectChanges();
      },
    });
  }

  private onIncomingMessage(msg: ChatMessage): void {
    // Aktif oda mesajıysa listeye ekle
    if (this.selectedRoom?.id === msg.roomId) {
      this.messages = [...this.messages, msg];
      this.shouldScrollToBottom = true;
      this.chatService.markAsRead(msg.roomId);
    }
    // Oda listesinde lastMessage ve unread count güncelle
    const room = this.rooms.find((r) => r.id === msg.roomId);
    if (room) {
      room.lastMessage = msg;
      const isMine = msg.senderId === this.auth.currentUser()?.id;
      if (!isMine && this.selectedRoom?.id !== msg.roomId) {
        room.unreadCount = (room.unreadCount || 0) + 1;
      }
      // Odayı listenin başına taşı
      this.rooms = [room, ...this.rooms.filter((r) => r.id !== room.id)];
      this.applyRoomFilter();
    } else {
      // Hiç bilmediğim bir oda mesajı geldiyse listeyi yenile (yeni gruba eklendim vb.)
      this.loadRooms();
    }
    this.cdr.detectChanges();
  }

  async sendMessage(): Promise<void> {
    const content = (this.messageInput || '').trim();
    if (!content || !this.selectedRoom) return;

    // Kutuyu hemen boşalt: hub çağrısı await edildikten sonra yapılan atama
    // değişiklik denetimini tetiklemediği için metin ekranda asılı kalıyordu.
    this.messageInput = '';
    this.cdr.detectChanges();

    try {
      await this.chatService.sendMessage({ roomId: this.selectedRoom.id, content });
    } catch (err) {
      // Gönderilemediyse kullanıcı yazdığını kaybetmesin — metni geri koy.
      this.messageInput = content;
      const detail = err instanceof Error ? err.message : 'Mesaj gönderilemedi.';
      this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      this.cdr.detectChanges();
    }
  }

  onInputType(): void {
    if (!this.selectedRoom) return;
    this.chatService.sendTyping(this.selectedRoom.id);
  }

  // ─── room helpers ──────────────────────────────────────────────────────

  roomDisplayName(room: ChatRoom): string {
    if (room.isGroup) return room.name || 'Grup';
    const myId = this.auth.currentUser()?.id;
    const other = room.members.find((m) => m.userId !== myId);
    return other?.fullName || 'Sohbet';
  }

  roomSubtitle(room: ChatRoom): string {
    if (room.isGroup) return `${room.members.length} üye`;
    const myId = this.auth.currentUser()?.id;
    const other = room.members.find((m) => m.userId !== myId);
    return other?.title || '';
  }

  initials(name: string): string {
    return (name || '?')
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  isMine(senderId: string): boolean {
    return this.auth.currentUser()?.id === senderId;
  }

  // ─── start new chat ────────────────────────────────────────────────────

  toggleStartChat(): void {
    this.showStartChatPanel = !this.showStartChatPanel;
  }

  filteredStartUsers(): ChatDirectoryUser[] {
    const q = (this.startChatSearch || '').trim().toLocaleLowerCase('tr-TR');
    if (!q) return this.users;
    return this.users.filter(
      (u) =>
        (u.fullName || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (u.title || '').toLocaleLowerCase('tr-TR').includes(q),
    );
  }

  startDirect(user: ChatDirectoryUser): void {
    this.chatService.getOrCreateDirect({ otherUserId: user.id }).subscribe({
      next: (res) => {
        this.showStartChatPanel = false;
        this.startChatSearch = '';

        // Oda zaten listede olabilir (daha önce yazışılmış); yoksa sunucudan çekilir.
        const existing = this.rooms.find((r) => r.id === res.id);
        if (existing) {
          this.selectRoom(existing);
          return;
        }
        this.chatService.getRoom(res.id).subscribe({ next: (room) => this.prependAndSelect(room) });
      },
      error: (err) => {
        const detail = err?.error?.message || 'Sohbet başlatılamadı.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      },
    });
  }

  /** Yeni oluşturulan odayı listenin başına ekleyip açar. */
  private prependAndSelect(room: ChatRoom): void {
    this.rooms = [room, ...this.rooms];
    this.applyRoomFilter();
    this.selectRoom(room);
  }

  openNewGroup(): void {
    const ref = this.dialogService.open(NewGroupDialogComponent, {
      header: 'Yeni Grup Oluştur',
      width: '560px',
      modal: true,
    });
    ref?.onClose.subscribe((result: { roomId: string } | null) => {
      if (result?.roomId) {
        this.chatService.getRoom(result.roomId).subscribe({
          next: (room) => this.prependAndSelect(room),
        });
      }
    });
  }
}
