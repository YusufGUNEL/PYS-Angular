import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';

/**
 * Tüm silme/onay dialoglarının tek ortak şablonu.
 *
 * Çağıran taraf `data` içinde aşağıdakileri verir; dialog UI bu değerlere göre
 * kendi metnini ve butonunu kurar. Hiç çağıran tarafa render mantığı sızmaz.
 *
 * data: {
 *   itemLabel: string;          // "Akıllı Şehir" (silinecek nesnenin adı)
 *   itemKindLabel: string;      // "proje", "kullanıcı", "doküman" gibi
 *   message?: string;           // Verilirse default cümlenin yerine geçer
 *   confirmLabel?: string;      // Default: "Evet, Sil"
 *   confirmIcon?: string;       // Default: "fa-solid fa-trash"
 *   severity?: 'danger' | 'warn'; // Default: 'danger'
 *   action: () => Observable<unknown>; // Asıl silme/işlem çağrısı
 *   successMessage?: string;    // Default: "{itemKindLabel} silindi."
 *   errorMessage?: string;      // Default: "{itemKindLabel} silinemedi."
 * }
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="flex flex-col">
      <div class="flex items-start gap-4 py-4">
        <i
          class="fa-solid text-4xl"
          [ngClass]="
            severity === 'warn'
              ? 'fa-circle-question text-amber-500'
              : 'fa-triangle-exclamation text-red-500'
          "
        ></i>
        <p class="text-slate-700">
          @if (message) {
            {{ message }}
          } @else {
            <strong class="text-slate-900">{{ itemLabel }}</strong>
            isimli {{ itemKindLabel }} silmek istediğinize emin misiniz?
            <span class="block text-xs text-slate-500 mt-1">Bu işlem geri alınamaz.</span>
          }
        </p>
      </div>

      <div class="flex justify-end gap-2 mt-4 border-t border-slate-100 pt-3">
        <button
          pButton
          type="button"
          label="İptal"
          icon="fa-solid fa-xmark"
          class="p-button-text"
          (click)="cancel()"
        ></button>
        <button
          pButton
          type="button"
          [label]="confirmLabel"
          [icon]="confirmIcon"
          [loading]="processing"
          [class]="severity === 'warn' ? 'p-button-warning' : 'p-button-danger'"
          (click)="confirm()"
        ></button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent implements OnInit {
  ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  itemLabel = '';
  itemKindLabel = 'kayıt';
  message?: string;
  confirmLabel = 'Evet, Sil';
  confirmIcon = 'fa-solid fa-trash';
  severity: 'danger' | 'warn' = 'danger';
  successMessage?: string;
  errorMessage?: string;
  private action?: () => Observable<unknown>;

  processing = false;

  ngOnInit(): void {
    const d = this.config?.data ?? {};
    this.itemLabel = d.itemLabel ?? '';
    this.itemKindLabel = d.itemKindLabel ?? 'kayıt';
    this.message = d.message;
    this.confirmLabel = d.confirmLabel ?? 'Evet, Sil';
    this.confirmIcon = d.confirmIcon ?? 'fa-solid fa-trash';
    this.severity = d.severity ?? 'danger';
    this.successMessage = d.successMessage ?? `${this.itemKindLabel} silindi.`;
    this.errorMessage = d.errorMessage ?? `${this.itemKindLabel} silinemedi.`;
    this.action = d.action;
  }

  cancel(): void {
    this.ref.close(false);
  }

  confirm(): void {
    if (!this.action) {
      this.ref.close(true);
      return;
    }
    this.processing = true;
    this.action().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Başarılı',
          detail: this.successMessage!,
        });
        this.processing = false;
        this.ref.close(true);
      },
      error: (err) => {
        // Backend'den dönen detaylı mesajı göstermeye çalış (try/catch'lerden gelir).
        const backendDetail = err?.error?.message
          ? `${err.error.message}${err.error.detail ? ' — ' + err.error.detail : ''}`
          : null;
        const detail =
          backendDetail ??
          (err?.status === 0
            ? 'Backend sunucusuna ulaşılamıyor.'
            : `${this.errorMessage} (HTTP ${err?.status ?? '?'})`);
        this.messageService.add({ severity: 'error', summary: 'Hata', detail, life: 8000 });
        this.processing = false;
      },
    });
  }
}
