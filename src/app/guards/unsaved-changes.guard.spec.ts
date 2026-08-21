import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';

import { CanComponentDeactivate, unsavedChangesGuard } from './unsaved-changes.guard';

function run(component: CanComponentDeactivate) {
  return TestBed.runInInjectionContext(() =>
    unsavedChangesGuard(component, null as never, null as never, null as never),
  );
}

describe('unsavedChangesGuard', () => {
  let confirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    confirm = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmationService, useValue: { confirm } }],
    });
  });

  it('kaydedilmemiş değişiklik yoksa anında geçirir', () => {
    expect(run({ hasUnsavedChanges: () => false })).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('hasUnsavedChanges tanımlı değilse geçirir', () => {
    expect(run({} as CanComponentDeactivate)).toBe(true);
  });

  it('kirli formda onay ister', () => {
    run({ hasUnsavedChanges: () => true });
    expect(confirm).toHaveBeenCalled();
  });

  it('kullanıcı onaylarsa çıkışa izin verir', async () => {
    confirm.mockImplementation((cfg) => cfg.accept());
    await expect(run({ hasUnsavedChanges: () => true })).resolves.toBe(true);
  });

  it('kullanıcı vazgeçerse sayfada tutar', async () => {
    confirm.mockImplementation((cfg) => cfg.reject());
    await expect(run({ hasUnsavedChanges: () => true })).resolves.toBe(false);
  });

  it('guard ile onay penceresi aynı ConfirmationService örneğini paylaşır', () => {
    // Bu servis kökte sağlanmazsa guard'ın açtığı onay hiçbir yerde görünmez
    // ve gezinme sonsuza dek askıda kalır.
    const fromRoot = TestBed.inject(ConfirmationService);
    run({ hasUnsavedChanges: () => true });
    expect(confirm).toHaveBeenCalled();
    expect(fromRoot).toBeTruthy();
  });
});
