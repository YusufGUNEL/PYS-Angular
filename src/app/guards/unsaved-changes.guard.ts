import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

/**
 * Kaydedilmemiş değişiklik koruyucusu.
 *
 * Kullanım:
 *   - Component, `CanComponentDeactivate` arayüzünü implement eder ve
 *     `hasUnsavedChanges()` döndürür (örn. form.dirty).
 *   - Rotalarda `canDeactivate: [unsavedChangesGuard]`
 *
 * Akış:
 *   - Component dirty değilse anında true → çıkışa izin
 *   - Dirty ise PrimeNG ConfirmationService ile uyarı dialog'u
 *
 * Avantajı:
 *   - tarayıcının yerleşik beforeunload dialog'una göre daha şık
 *   - sadece SPA içi gezinmede çalışır; sekme kapatma için ayrı window listener gerekir
 */
export interface CanComponentDeactivate {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (!component.hasUnsavedChanges || !component.hasUnsavedChanges()) {
    return true;
  }

  const confirmationService = inject(ConfirmationService);

  return new Promise<boolean>((resolve) => {
    confirmationService.confirm({
      header: 'Kaydedilmemiş Değişiklikler',
      message: 'Bu sayfada kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Evet, çık',
      rejectLabel: 'Hayır, kalıyorum',
      accept: () => resolve(true),
      reject: () => resolve(false),
    });
  });
};
