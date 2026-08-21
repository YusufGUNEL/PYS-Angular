import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileSelectEvent } from 'primeng/fileupload';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { FileUploadModule } from 'primeng/fileupload';

import { PetitionService } from '../../services/petition.service';
import { petitionStatusLabel, petitionSubjectLabel } from '../../shared/petition-labels';
import { PetitionDto, PetitionMessage } from '../../models/petition.model';
import { ActivatedRoute } from '@angular/router';
import { notBlank } from '../../shared/validators';

@Component({
  selector: 'app-my-petitions',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    FileUploadModule,
  ],
  providers: [MessageService],
  templateUrl: './my-petitions.html',
})
export class MyPetitionsComponent implements OnInit {
  /** Şablonda ham durum kodu yerine Türkçe etiket gösterilir. */
  statusLabel = petitionStatusLabel;

  /** Şablonda ham konu kodu ('role-change') yerine Türkçe etiket gösterilir. */
  subjectLabel = petitionSubjectLabel;

  private petitionService = inject(PetitionService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  petitions: PetitionDto[] = [];
  loading = true;

  messages: Record<string, PetitionMessage[]> = {};
  newMessageText: Record<string, string> = {};

  // create form / popup
  showCreate = false;
  form: FormGroup;
  subjects = [
    { label: 'Rol Değişikliği', value: 'role-change' },
    { label: 'Genel İstek', value: 'general' },
    { label: 'Diğer', value: 'other' },
  ];
  files: File[] = [];
  saving = false;

  constructor() {
    this.form = this.fb.group({
      subject: ['', Validators.required],
      // Başlık: zorunlu, 3-150 karakter, salt boşluk olmasın
      title: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(150), notBlank],
      ],
      // İçerik: zorunlu, 10-2000 karakter, salt boşluk olmasın
      content: [
        '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(2000), notBlank],
      ],
    });
  }

  ngOnInit(): void {
    this.load();
    this.route.queryParams.subscribe((params) => {
      if (params['openCreate']) {
        this.openCreate();
      }
    });
  }

  load(): void {
    this.loading = true;
    this.petitionService.getUserPetitions().subscribe({
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

  openCreate(): void {
    this.showCreate = true;
  }

  closeCreate(): void {
    this.showCreate = false;
    this.form.reset();
    this.files = [];
    this.saving = false;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.files = input.files ? Array.from(input.files) : [];
  }

  // PrimeNG p-fileupload (multiple basic mode) için seçim handler'ı.
  // Aynı files dizisini doldurur — gönderim mantığı değişmez.
  onPrimeFileSelect(event: FileSelectEvent): void {
    const incoming = event?.files ?? [];
    if (!incoming.length) return;
    // Aynı isimde tekrar eklenmesin
    const seen = new Set(this.files.map((f) => `${f.name}_${f.size}`));
    for (const f of incoming) {
      const key = `${f.name}_${f.size}`;
      if (!seen.has(key)) {
        this.files.push(f);
        seen.add(key);
      }
    }
  }

  removeAttachment(i: number): void {
    this.files.splice(i, 1);
  }

  submitNewPetition(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fd = new FormData();
    fd.append('subject', this.form.value.subject);
    fd.append('title', this.form.value.title);
    fd.append('content', this.form.value.content);
    this.files.forEach((f) => fd.append('files', f, f.name));

    this.saving = true;
    this.petitionService.createPetition(fd).subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Başarılı',
          detail: 'Dilekçe gönderildi.',
        });
        this.closeCreate();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        const detail = err?.error?.message || 'Dilekçe gönderilemedi.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      },
    });
  }

  loadMessages(petitionId: string): void {
    if (this.messages[petitionId]) return;
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
