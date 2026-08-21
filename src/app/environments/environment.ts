import { isDevMode } from '@angular/core';

import { AppEnvironment } from './environment.model';

/**
 * Ortam ayarları.
 *
 * Ayrı bir `environment.prod.ts` bilinçli olarak tutulmuyor: API adresi derleme
 * anında değil, çalışma zamanında `public/assets/env.js` (`window.__env`) üzerinden
 * okunuyor. Böylece aynı `dist/` çıktısı yeniden derlenmeden farklı sunuculara
 * dağıtılabiliyor; iki dosyayı senkron tutma yükü de ortadan kalkıyor.
 */
export const environment: AppEnvironment = {
  /** Angular'ın kendi derleme kipinden türetilir; elle senkron tutulması gerekmez. */
  get production(): boolean {
    return !isDevMode();
  },

  get apiUrl(): string {
    return window.__env?.apiUrl || 'http://localhost:5058';
  },
};
