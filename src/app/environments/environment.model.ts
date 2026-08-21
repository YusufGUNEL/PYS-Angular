/** Ortam dosyalarının uyması gereken sözleşme. */
export interface AppEnvironment {
  readonly production: boolean;
  readonly apiUrl: string;
}

declare global {
  interface Window {
    /** `assets/env.js` tarafından çalışma zamanında doldurulan ayarlar. */
    __env?: { apiUrl?: string };
  }
}
