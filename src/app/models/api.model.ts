/**
 * Backend'in yazma uçlarından (POST/PUT/DELETE) dönen ortak yanıt.
 * Controller'ların çoğu yalnızca bir bilgi mesajı döndürür.
 */
export interface ApiMessage {
  message?: string;
}

/**
 * Yeni kayıt oluşturan uçların yanıtı.
 * Kimlik, controller sürümüne göre ya doğrudan `id` ya da `data.id` alanında gelir.
 */
export interface CreatedResponse extends ApiMessage {
  id?: string;
  data?: { id?: string };
}
