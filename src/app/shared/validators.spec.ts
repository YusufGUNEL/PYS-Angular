import { FormControl } from '@angular/forms';
import {
  EMAIL_PATTERN,
  minSelected,
  NAME_PATTERN,
  notBlank,
  PASSWORD_PATTERN,
  TITLE_PATTERN,
} from './validators';

describe('minSelected', () => {
  const atLeastOne = minSelected(1);

  it('boş dizide hata döner', () => {
    expect(atLeastOne(new FormControl([]))).toEqual({ minSelected: { required: 1, actual: 0 } });
  });

  it('yeterli seçim varsa null döner', () => {
    expect(atLeastOne(new FormControl(['a']))).toBeNull();
  });

  it('dizi olmayan değeri boş kabul eder', () => {
    expect(atLeastOne(new FormControl(null))).toEqual({ minSelected: { required: 1, actual: 0 } });
  });

  it('eşik değerini uygular', () => {
    expect(minSelected(2)(new FormControl(['a']))).not.toBeNull();
    expect(minSelected(2)(new FormControl(['a', 'b']))).toBeNull();
  });
});

describe('notBlank', () => {
  it('yalnızca boşluktan oluşan metni reddeder', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
  });

  it('dolu metni kabul eder', () => {
    expect(notBlank(new FormControl(' merhaba '))).toBeNull();
  });

  it('boş metni required doğrulayıcısına bırakır', () => {
    expect(notBlank(new FormControl(''))).toBeNull();
  });

  it('metin olmayan değerlere karışmaz', () => {
    expect(notBlank(new FormControl(42))).toBeNull();
  });
});

describe('doğrulama desenleri', () => {
  it('NAME_PATTERN Türkçe harfleri kabul eder, rakamı reddeder', () => {
    expect(NAME_PATTERN.test('Yusuf Günel')).toBe(true);
    expect(NAME_PATTERN.test("O'Neill-Şahin")).toBe(true);
    expect(NAME_PATTERN.test('Ali 123')).toBe(false);
  });

  it('TITLE_PATTERN ünvanlardaki rakam ve sembolleri kabul eder', () => {
    expect(TITLE_PATTERN.test('Yazılım Mühendisi (Kıdemli)')).toBe(true);
    expect(TITLE_PATTERN.test('Uzman #1')).toBe(false);
  });

  it('EMAIL_PATTERN geçerli adresleri ayırt eder', () => {
    expect(EMAIL_PATTERN.test('ad.soyad@belediye.gov.tr')).toBe(true);
    expect(EMAIL_PATTERN.test('ad@soyad')).toBe(false);
    expect(EMAIL_PATTERN.test('şule@kurum.gov.tr')).toBe(false);
  });

  it('PASSWORD_PATTERN harf ve rakam birlikteliğini şart koşar', () => {
    expect(PASSWORD_PATTERN.test('sifre123')).toBe(true);
    expect(PASSWORD_PATTERN.test('sadeceharf')).toBe(false);
    expect(PASSWORD_PATTERN.test('123456')).toBe(false);
    expect(PASSWORD_PATTERN.test('ab12')).toBe(false);
  });
});
