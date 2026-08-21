import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG Bileşenleri
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageService } from 'primeng/api';
import { FileSelectEvent } from 'primeng/fileupload';
import { FileUploadModule } from 'primeng/fileupload';
import { MultiSelectModule } from 'primeng/multiselect';
import { forkJoin } from 'rxjs';

// Servisler ve Modeller
import { ProjectService } from '../../services/project.service';
import { UserService } from '../../services/user.service';
import { ProjectWorkerService } from '../../services/project-worker.service';
import { ProjectDocumentService } from '../../services/project-document.service';
import {
  AddProjectModel,
  ProjectStatus,
  AddProjectDocumentModel,
  ProjectDocumentFileType,
} from '../../models/project.model';
import { User } from '../../models/user.model';

import { AuthService } from '../../services/auth.service';

// CanDeactivate guard sözleşmesi
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-project-add',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    DatePickerModule,
    TextareaModule,
    ToastModule,
    InputMaskModule,
    FileUploadModule,
    MultiSelectModule,
  ],
  providers: [MessageService],
  templateUrl: './project-add.html',
  styleUrl: './project-add.css',
})
export class ProjectAddComponent implements OnInit, CanComponentDeactivate {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private projectWorkerService = inject(ProjectWorkerService);
  private projectDocumentService = inject(ProjectDocumentService);
  private messageService = inject(MessageService);
  router = inject(Router);
  auth = inject(AuthService);

  projectForm: FormGroup;
  saving = false;
  uploadingImage = false;
  uploadingResource = false;
  imageFileName = '';
  resourceFileName = '';

  // Dropdown Verileri
  users: User[] = [];
  statuses: ProjectStatus[] = [];

  constructor() {
    this.projectForm = this.fb.group(
      {
        projectName: [
          '',
          [Validators.required, Validators.minLength(3), Validators.maxLength(150)],
        ],
        description: ['', [Validators.maxLength(500)]],
        mainImageUrl: [''],
        resourceFileUrl: [''],
        startDate: [this.getTodayDate(), [Validators.required, this.calendarDateValidator]],
        endDate: ['', [this.calendarDateValidator]],
        statusId: [null, Validators.required],
        ownerId: [null, Validators.required],
        workerIds: [[]],
        // Çoklu doküman: her satırda fileName + fileUrl + description + fileType
        documents: this.fb.array([]),
      },
      { validators: this.endDateAfterStart },
    );
  }

  // DD.MM.YYYY formatını VE gerçek takvim tarihini doğrular (31.02 gibi imkansız tarihleri reddeder).
  // Yıl aralığı: 1900-2099.
  private calendarDateValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value as string) ?? '';
    if (!v) return null; // boş ise required ayrı kontrol eder
    if (!/^(\d{2})\.(\d{2})\.(\d{4})$/.test(v)) return { dateFormat: true };
    const [d, m, y] = v.split('.').map((n) => parseInt(n, 10));
    if (y < 1900 || y > 2099) return { dateYearRange: true };
    if (m < 1 || m > 12) return { dateInvalid: true };
    const daysInMonth = new Date(y, m, 0).getDate();
    if (d < 1 || d > daysInMonth) return { dateInvalid: true };
    return null;
  }

  // Form helper'ları (template'den erişim için)
  get documents(): FormArray {
    return this.projectForm.get('documents') as FormArray;
  }

  // Yeni boş bir doküman satırı ekler.
  addDocumentRow(): void {
    this.documents.push(
      this.fb.group({
        fileName: ['', [Validators.maxLength(250)]],
        fileUrl: [''],
        description: ['', [Validators.maxLength(250)]],
        fileType: ['other' as ProjectDocumentFileType],
      }),
    );
  }

  // İçerikten doküman satırını çıkarır.
  removeDocumentRow(index: number): void {
    this.documents.removeAt(index);
  }

  // Bir doküman satırı için dosya seçildiğinde upload edip URL'yi yansıtır.
  onDocumentFileSelected(event: FileSelectEvent, index: number): void {
    const file = event.files?.[0];
    if (!file) return;

    const fileType: ProjectDocumentFileType = this.detectFileType(file);
    const uploadType: 'image' | 'resource' = fileType === 'image' ? 'image' : 'resource';

    this.projectService.uploadFile(file, uploadType).subscribe({
      next: (res) => {
        this.documents.at(index).patchValue({
          fileName: res.fileName,
          fileUrl: res.url,
          fileType,
        });
        this.messageService.add({ severity: 'success', summary: 'Yüklendi', detail: res.fileName });
      },
      error: (err) => {
        // Backend'den dönen anlamlı mesajı (FilesController.cs try/catch) toast'ta göster.
        const detail = err?.error?.message
          ? `${err.error.message}${err.error.hint ? ' — ' + err.error.hint : ''}`
          : err?.status === 0
            ? 'Backend sunucusuna ulaşılamıyor (API çalışıyor mu?).'
            : `Doküman yüklenemedi (HTTP ${err?.status ?? '?'}).`;
        this.messageService.add({ severity: 'error', summary: 'Hata', detail, life: 8000 });
      },
    });
  }

  private detectFileType(file: File): ProjectDocumentFileType {
    const name = (file.name || '').toLowerCase();
    if (file.type.startsWith('image/')) return 'image';
    if (name.endsWith('.pdf')) return 'pdf';
    if (/(\.docx?|\.xlsx?|\.txt|\.zip)$/i.test(name)) return 'document';
    return 'other';
  }

  // Yardımcı: Bugünün tarihini GG.AA.YYYY formatında döner
  getTodayDate(): string {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // endDate >= startDate doğrulaması (group seviyesinde)
  private endDateAfterStart = (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('startDate')?.value as string;
    const end = group.get('endDate')?.value as string;
    if (!start || !end || start.length < 10 || end.length < 10) return null;
    const toDate = (s: string) => {
      const [d, m, y] = s.split('.');
      return new Date(`${y}-${m}-${d}`);
    };
    return toDate(end) < toDate(start) ? { endBeforeStart: true } : null;
  };

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      // Proje Sahibini Seçmek İçin Kullanıcıları Yükle
      this.userService.getUsers().subscribe({
        next: (data) => (this.users = data),
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: 'Kullanıcılar yüklenemedi.',
          }),
      });
    } else {
      // Admin değilse sorumlu otomatik kendisidir.
      const user = this.auth.currentUser();
      if (user) {
        // Kendisini listeye ekleyelim ki dropdown boş görünmesin veya dropdown kullanılmasın
        //this.users = [{ id: user.id, fullName: user.fullName || 'Ben', email: '', isActive: true, roleId: '', expertiseAreaId: '' }];
        this.projectForm.patchValue({ ownerId: user.id });
        this.projectForm.get('ownerId')?.disable();
      }
    }

    // Proje Durumlarını Yükle
    this.projectService.getProjectStatuses().subscribe({
      next: (data) => {
        this.statuses = data;
        const defaultStatus =
          this.statuses.find((s) => s.statusName === 'Planlanıyor') ??
          this.statuses.find((s) => s.statusName === 'Devam Ediyor') ??
          this.statuses[0];

        if (defaultStatus) {
          this.projectForm.patchValue({ statusId: defaultStatus.id });
          this.projectForm.get('statusId')?.disable({ emitEvent: false });
        }
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Proje durumları yüklenemedi.',
        }),
    });
  }

  // Backend'e dosya yükle, dönen URL'yi forma yaz
  onFileSelected(event: FileSelectEvent, controlName: 'mainImageUrl' | 'resourceFileUrl'): void {
    const file = event.files?.[0];
    if (!file) return;

    const isImage = controlName === 'mainImageUrl';
    if (isImage) this.uploadingImage = true;
    else this.uploadingResource = true;

    this.projectService.uploadFile(file, isImage ? 'image' : 'resource').subscribe({
      next: (res) => {
        this.projectForm.patchValue({ [controlName]: res.url });
        if (isImage) {
          this.imageFileName = res.fileName;
          this.uploadingImage = false;
        } else {
          this.resourceFileName = res.fileName;
          this.uploadingResource = false;
        }
        this.messageService.add({ severity: 'success', summary: 'Yüklendi', detail: res.fileName });
      },
      error: (err) => {
        if (isImage) this.uploadingImage = false;
        else this.uploadingResource = false;
        const detail = err?.error?.message
          ? `${err.error.message}${err.error.hint ? ' — ' + err.error.hint : ''}`
          : err?.status === 0
            ? 'Backend sunucusuna ulaşılamıyor (API çalışıyor mu?).'
            : `Dosya yüklenemedi (HTTP ${err?.status ?? '?'}).`;
        this.messageService.add({ severity: 'error', summary: 'Hata', detail, life: 8000 });
      },
    });
  }

  // Tarih girişini akıllıca formatlayan fonksiyon
  onDateInput(event: Event, fieldName: string): void {
    const inputEl = event.target as HTMLInputElement;
    let input = inputEl.value.replace(/\D/g, ''); // yalnızca rakamlar
    if (input.length > 8) input = input.substring(0, 8); // Max 8 rakam (GGAA YYYY)

    let formatted = '';
    if (input.length > 0) {
      // GÜN KONTROLÜ (Max 31)
      let day = input.substring(0, 2);
      if (day.length === 2 && parseInt(day) > 31) day = '31';
      formatted += day;
    }
    if (input.length >= 3) {
      formatted += '.';
      // AY KONTROLÜ (Max 12)
      let month = input.substring(2, 4);
      if (month.length === 2 && parseInt(month) > 12) month = '12';
      formatted += month;
    }
    if (input.length >= 5) {
      formatted += '.';
      formatted += input.substring(4, 8);
    }

    // Formu ve input değerini güncelle
    this.projectForm.get(fieldName)?.setValue(formatted, { emitEvent: false });
    inputEl.value = formatted;
  }

  // Takvimden seçilince string formatına çevir
  onDateSelect(date: Date, fieldName: string): void {
    if (date) {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const formatted = `${day}.${month}.${year}`;
      this.projectForm.get(fieldName)?.setValue(formatted);
    }
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      const reason = this.projectForm.errors?.['endBeforeStart']
        ? 'Bitiş tarihi başlangıçtan önce olamaz.'
        : 'Lütfen formu eksiksiz doldurun.';
      this.messageService.add({ severity: 'warn', summary: 'Uyarı', detail: reason });
      return;
    }

    this.saving = true;
    const formValue = this.projectForm.getRawValue();

    const parseDate = (dateStr: string) => {
      if (!dateStr || dateStr.length < 10) return undefined;
      const parts = dateStr.split('.');
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
    };

    const newProject: AddProjectModel = {
      projectName: formValue.projectName,
      description: formValue.description,
      mainImageUrl: formValue.mainImageUrl,
      resourceFileUrl: formValue.resourceFileUrl,
      startDate: parseDate(formValue.startDate) || new Date().toISOString(),
      endDate: parseDate(formValue.endDate),
      statusId: formValue.statusId,
      ownerId: formValue.ownerId,
    };

    this.projectService.addProject(newProject).subscribe({
      next: (res) => {
        const projectId = res?.data?.id ?? res?.id;
        const workerIds = (formValue.workerIds ?? []) as string[];
        const uniqueWorkerIds = Array.from(new Set(workerIds)).filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id !== formValue.ownerId,
        );

        // Çoklu dokümanlar: dosya yüklenmiş olanları (fileUrl dolu) DB'ye bağla.
        const documentRows = (this.documents.value as ProjectDocumentFormRow[]) ?? [];
        const validDocs = documentRows.filter((d) => d.fileUrl);

        // projectId yoksa (backend kimlik döndürmediyse) alt kayıtlar atlanır;
        // aşağıdaki kontrol kullanıcıya yine de başarı mesajı gösterir.
        const workerRequests = projectId
          ? uniqueWorkerIds.map((userId) =>
              this.projectWorkerService.addProjectWorker({
                projectId,
                userId,
                projectRole: 'Geliştirici',
              }),
            )
          : [];

        const docRequests = projectId
          ? validDocs.map((d) =>
              this.projectDocumentService.add({
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                description: d.description,
                fileType: d.fileType,
                projectId,
                uploadedById: formValue.ownerId,
              } as AddProjectDocumentModel),
            )
          : [];

        const allRequests = [...workerRequests, ...docRequests];
        if (!projectId || allRequests.length === 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Proje başarıyla eklendi!',
          });
          this.saving = false;
          this.projectForm.markAsPristine();
          setTimeout(() => this.router.navigate(['/projects']), 1500);
          return;
        }

        forkJoin(allRequests).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Başarılı',
              detail: 'Proje, çalışanlar ve dokümanlar kaydedildi.',
            });
            this.saving = false;
            this.projectForm.markAsPristine();
            setTimeout(() => this.router.navigate(['/projects']), 1500);
          },
          error: () => {
            this.messageService.add({
              severity: 'warn',
              summary: 'Uyarı',
              detail: 'Proje eklendi, bazı ek kayıtlar eklenemedi.',
            });
            this.saving = false;
            this.projectForm.markAsPristine();
            setTimeout(() => this.router.navigate(['/projects']), 1500);
          },
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Ekleme başarısız.',
        });
        this.saving = false;
      },
    });
  }

  /**
   * CanDeactivate guard'ı için. Form dirty ise (kullanıcı bir alan değiştirdiyse)
   * ve kaydetme işlemi devam etmiyorsa "kaydedilmemiş değişiklik var" uyarısı verir.
   */
  hasUnsavedChanges(): boolean {
    return this.projectForm.dirty && !this.saving;
  }
}

/** Proje formundaki "Dokümanlar" dizisinin tek bir satırı. */
interface ProjectDocumentFormRow {
  fileName: string;
  fileUrl: string;
  description?: string;
  fileType: ProjectDocumentFileType;
}
