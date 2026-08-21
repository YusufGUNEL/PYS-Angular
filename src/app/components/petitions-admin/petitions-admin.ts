import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';

import { PetitionService } from '../../services/petition.service';
import { petitionStatusLabel, petitionSubjectLabel } from '../../shared/petition-labels';
import { PetitionDto, PetitionMessage } from '../../models/petition.model';

@Component({
  selector: 'app-petitions-admin',
  imports: [CommonModule, TableModule, ButtonModule, ToastModule, FormsModule],
  providers: [MessageService],
  templateUrl: './petitions-admin.html',
})
export class PetitionsAdminComponent implements OnInit {
  /** Şablonda ham durum kodu yerine Türkçe etiket gösterilir. */
  statusLabel = petitionStatusLabel;

  /** Şablonda ham konu kodu ('role-change') yerine Türkçe etiket gösterilir. */
  subjectLabel = petitionSubjectLabel;

  private petitionService = inject(PetitionService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  petitions: PetitionDto[] = [];
  loading = true;
  showApproved = false; // default: sadece güncel / onay bekleyenleri göster

  // mesajlar, textarea içerikleri
  messages: Record<string, PetitionMessage[]> = {};
  newMessageText: Record<string, string> = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const status = this.showApproved ? undefined : 'Pending';
    this.petitionService.getAllPetitions(status).subscribe({
      next: (data) => {
        this.petitions = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'Dilekçeler yüklenemedi.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail: msg });
        this.cdr.detectChanges();
      },
    });
  }

  approve(id: string): void {
    this.petitionService.approvePetition(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Onay',
          detail: 'Dilekçe onaylandı.',
        });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Hata', detail: 'Onay başarısız.' });
      },
    });
  }

  reject(id: string): void {
    this.petitionService.rejectPetition(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Reddedildi',
          detail: 'Dilekçe reddedildi.',
        });
        this.load();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Reddetme başarısız.',
        });
      },
    });
  }

  // UI helper: sadece gösterim için filtre uygula (default pending değilse hepsi)
  get visiblePetitions(): PetitionDto[] {
    if (!this.petitions) return [];
    return this.showApproved
      ? this.petitions
      : this.petitions.filter((p) => p.status === 'Pending');
  }

  toggleShowApproved(): void {
    this.showApproved = !this.showApproved;
    this.load();
  }

  // Mesajlaşma
  loadMessages(petitionId: string): void {
    if (this.messages[petitionId]) return; // önceden yüklüyse tekrar yükleme
    this.petitionService.getMessages(petitionId).subscribe({
      next: (data) => {
        this.messages[petitionId] = data || [];
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Mesajlar yüklenemedi.',
        });
      },
    });
  }

  sendMessage(petitionId: string): void {
    const text = (this.newMessageText[petitionId] || '').trim();
    if (!text) return;
    this.petitionService.addMessage(petitionId, text).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Gönderildi',
          detail: 'Mesaj gönderildi.',
        });
        // yenile
        this.messages[petitionId] = [];
        this.loadMessages(petitionId);
        this.newMessageText[petitionId] = '';
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Mesaj gönderilemedi.',
        });
      },
    });
  }
}
