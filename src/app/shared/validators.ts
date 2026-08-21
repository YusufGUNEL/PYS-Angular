import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Ad-soyad: yalnızca harf (Türkçe dahil), boşluk, kesme, nokta ve tire. */
export const NAME_PATTERN = /^[\p{L}\s.'-]+$/u;

/** Ünvan / birim adı: harf, rakam ve temel noktalama. */
export const TITLE_PATTERN = /^[\p{L}\p{N}\s.&/()-]+$/u;

/** E-posta: ASCII yerel ad + alan adı (Türkçe karakter kabul edilmez). */
export const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Parola: 6-72 karakter, en az bir harf ve bir rakam. */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{6,72}$/;

/**
 * Dizi değerli kontroller (ör. p-multiselect) için "en az N öğe seçili olmalı".
 * `Validators.required` boş diziyi geçerli saydığı için gereklidir.
 */
export function minSelected(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Array.isArray(control.value) ? control.value : [];
    return value.length >= min ? null : { minSelected: { required: min, actual: value.length } };
  };
}

/**
 * Yalnızca boşluktan oluşan metinleri reddeder.
 * `Validators.required` "   " değerini dolu kabul ettiği için tamamlayıcıdır.
 */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || value.length === 0) return null;
  return value.trim().length === 0 ? { blank: true } : null;
}
