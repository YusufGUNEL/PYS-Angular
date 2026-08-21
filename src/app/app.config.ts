import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeTr from '@angular/common/locales/tr';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ConfirmationService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';

// DatePipe/DecimalPipe gibi boruların gg.aa.yyyy ve virgüllü ondalık üretmesi için gerekli.
registerLocaleData(localeTr);
import { authInterceptor } from './services/auth.interceptor';

/**
 * Aura temasının birincil rengini uygulamanın marka indigosuna sabitler.
 * Böylece PrimeNG butonları ile Tailwind ile boyanmış navbar/rozetler aynı paleti kullanır.
 */
const PysTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
  },
});

/** PrimeNG bileşenlerinin (takvim, tablo, dosya yükleme...) Türkçe metinleri. */
const trTranslation = {
  accept: 'Evet',
  reject: 'Hayır',
  choose: 'Seç',
  upload: 'Yükle',
  cancel: 'İptal',
  clear: 'Temizle',
  apply: 'Uygula',
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  dayNamesMin: ['Pa', 'Pz', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
  monthNames: [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ],
  monthNamesShort: [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ],
  today: 'Bugün',
  weekHeader: 'Hf',
  firstDayOfWeek: 1,
  dateFormat: 'dd.mm.yy',
  weak: 'Zayıf',
  medium: 'Orta',
  strong: 'Güçlü',
  passwordPrompt: 'Bir şifre girin',
  emptyMessage: 'Sonuç bulunamadı',
  emptyFilterMessage: 'Filtreye uyan sonuç yok',

  // Ekran okuyucuya okunan etiketler (sayfalama okları, sıralama, seçim kutuları...).
  // Bunlar olmadan PrimeNG "First Page", "Next Page" gibi İngilizce metinler bildirir.
  aria: {
    trueLabel: 'Evet',
    falseLabel: 'Hayır',
    nullLabel: 'Seçilmedi',
    star: '1 yıldız',
    stars: '{star} yıldız',
    selectAll: 'Tümünü seç',
    unselectAll: 'Seçimi kaldır',
    close: 'Kapat',
    previous: 'Önceki',
    next: 'Sonraki',
    navigation: 'Gezinme',
    scrollTop: 'Yukarı kaydır',
    moveTop: 'En üste taşı',
    moveUp: 'Yukarı taşı',
    moveDown: 'Aşağı taşı',
    moveBottom: 'En alta taşı',
    moveToTarget: 'Hedefe taşı',
    moveToSource: 'Kaynağa taşı',
    moveAllToTarget: 'Tümünü hedefe taşı',
    moveAllToSource: 'Tümünü kaynağa taşı',
    pageLabel: '{page}. sayfa',
    firstPageLabel: 'İlk sayfa',
    lastPageLabel: 'Son sayfa',
    nextPageLabel: 'Sonraki sayfa',
    prevPageLabel: 'Önceki sayfa',
    rowsPerPageLabel: 'Sayfa başına kayıt',
    previousPageLabel: 'Önceki sayfa',
    jumpToPageDropdownLabel: 'Sayfaya git',
    jumpToPageInputLabel: 'Sayfaya git',
    selectRow: 'Satırı seç',
    unselectRow: 'Satır seçimini kaldır',
    expandRow: 'Satırı genişlet',
    collapseRow: 'Satırı daralt',
    showFilterMenu: 'Filtre menüsünü aç',
    hideFilterMenu: 'Filtre menüsünü kapat',
    filterOperator: 'Filtre operatörü',
    filterConstraint: 'Filtre koşulu',
    editRow: 'Satırı düzenle',
    saveEdit: 'Değişikliği kaydet',
    cancelEdit: 'Düzenlemeyi iptal et',
    listView: 'Liste görünümü',
    gridView: 'Izgara görünümü',
    slide: 'Slayt',
    slideNumber: '{slideNumber}. slayt',
    zoomImage: 'Görseli büyüt',
    zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır',
    rotateRight: 'Sağa döndür',
    rotateLeft: 'Sola döndür',
  },
};

/**
 * Uygulama genelindeki sağlayıcılar (provider).
 * .NET tarafındaki `Program.cs` → `builder.Services.Add...` bloğunun karşılığı.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'tr' },

    // Kökte tek örnek: App bileşenindeki <p-confirmDialog> ile
    // unsavedChangesGuard'ın inject(ConfirmationService) çağrısı aynı örneğe bakmalı.
    // Aksi halde guard'ın açtığı onay hiçbir yerde görünmez ve gezinme askıda kalır.
    ConfirmationService,

    // Yakalanmamış hataları ve reddedilen promise'leri konsola raporlar.
    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes,
      // Rota parametrelerini doğrudan @Input()'lara bağlar.
      withComponentInputBinding(),
      // Sayfa değişiminde en üste dön, geri tuşunda eski konuma geri git.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    // Tüm HTTP isteklerine JWT ekleyen ve 401'de oturumu kapatan interceptor.
    provideHttpClient(withInterceptors([authInterceptor])),

    // PrimeNG animasyonları; 'async' sürümü animasyon paketini tembel yükler.
    provideAnimationsAsync(),

    providePrimeNG({
      theme: {
        preset: PysTheme,
        options: {
          // 'p' öneki, PrimeNG CSS değişkenlerini Tailwind'inkilerden ayırır.
          prefix: 'p',
          darkModeSelector: 'none',
          cssLayer: false,
        },
      },
      translation: trTranslation,
    }),
  ],
};
