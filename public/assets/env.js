// Çalışma zamanında okunan ortam değişkenleri.
// Build sonrası dahi değiştirilebilir — Angular environment.ts içinden window.__env üzerinden okunur.
// API farklı IP/port'tan servis ediliyorsa apiUrl'i değiştir.
window.__env = {
  apiUrl: 'http://localhost:5058'
};
