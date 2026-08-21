import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { MultiSelectModule } from 'primeng/multiselect';
import { forkJoin, of } from 'rxjs';

import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { FileSelectEvent } from 'primeng/fileupload';

import { Project, ProjectStatus, UpdateProjectModel } from '../../models/project.model';
import { User } from '../../models/user.model';
import { ProjectWorker } from '../../models/project-worker.model';
import { ProjectService } from '../../services/project.service';
import { ProjectWorkerService } from '../../services/project-worker.service';

@Component({
  selector: 'app-project-update-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    MultiSelectModule,
  ],
  templateUrl: './project-update-dialog.html',
})
export class ProjectUpdateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private projectWorkerService = inject(ProjectWorkerService);
  private messageService = inject(MessageService);
  config = inject(DynamicDialogConfig);
  ref = inject(DynamicDialogRef);

  form: FormGroup;
  saving = false;
  uploadingImage = false;
  uploadingResource = false;
  imageFileName = '';
  resourceFileName = '';

  project: Project | null = null;
  users: User[] = [];
  statuses: ProjectStatus[] = [];
  existingWorkers: ProjectWorker[] = [];

  constructor() {
    this.form = this.fb.group(
      {
        id: [''],
        projectName: [
          '',
          [Validators.required, Validators.minLength(3), Validators.maxLength(150)],
        ],
        description: ['', [Validators.maxLength(500)]],
        mainImageUrl: [''],
        resourceFileUrl: [''],
        startDate: ['', [Validators.required, this.calendarDateValidator]],
        endDate: ['', [this.calendarDateValidator]],
        statusId: [null, Validators.required],
        ownerId: [null, Validators.required],
        workerIds: [[]],
      },
      { validators: this.endDateAfterStart },
    );
  }

  // Gerçek takvim tarihi doğrulayıcısı — 31.02 gibi imkansız tarihleri ve yıl aralığını kontrol eder.
  private calendarDateValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value as string) ?? '';
    if (!v) return null;
    if (!/^(\d{2})\.(\d{2})\.(\d{4})$/.test(v)) return { dateFormat: true };
    const [d, m, y] = v.split('.').map((n) => parseInt(n, 10));
    if (y < 1900 || y > 2099) return { dateYearRange: true };
    if (m < 1 || m > 12) return { dateInvalid: true };
    const daysInMonth = new Date(y, m, 0).getDate();
    if (d < 1 || d > daysInMonth) return { dateInvalid: true };
    return null;
  }

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

  private formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
  }

  ngOnInit(): void {
    if (this.config.data) {
      this.project = this.config.data.project as Project;
      this.users = this.config.data.users || [];
      this.statuses = this.config.data.statuses || [];

      if (this.project) {
        this.form.patchValue({
          id: this.project.id,
          projectName: this.project.projectName,
          description: this.project.description ?? '',
          mainImageUrl: this.project.mainImageUrl ?? '',
          resourceFileUrl: this.project.resourceFileUrl ?? '',
          startDate: this.formatDate(this.project.startDate),
          endDate: this.formatDate(this.project.endDate),
          statusId: this.project.statusId,
          ownerId: this.project.ownerId,
        });

        this.loadProjectWorkers();
      }
    }
  }

  private loadProjectWorkers(): void {
    if (!this.project?.id) return;

    this.projectWorkerService.getProjectWorkers().subscribe({
      next: (data) => {
        this.existingWorkers = data.filter((w) => w.projectId === this.project?.id);
        const workerIds = this.existingWorkers.map((w) => w.userId);
        this.form.patchValue({ workerIds });
      },
    });
  }

  onDateInput(event: Event, fieldName: string): void {
    const inputEl = event.target as HTMLInputElement;
    let input = inputEl.value.replace(/\D/g, '');
    if (input.length > 8) input = input.substring(0, 8);

    let formatted = '';
    if (input.length > 0) {
      let day = input.substring(0, 2);
      if (day.length === 2 && parseInt(day) > 31) day = '31';
      formatted += day;
    }
    if (input.length >= 3) {
      formatted += '.';
      let month = input.substring(2, 4);
      if (month.length === 2 && parseInt(month) > 12) month = '12';
      formatted += month;
    }
    if (input.length >= 5) {
      formatted += '.' + input.substring(4, 8);
    }

    this.form.get(fieldName)?.setValue(formatted, { emitEvent: false });
    inputEl.value = formatted;
  }

  onDateSelect(date: Date, fieldName: string): void {
    if (!date) return;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    this.form.get(fieldName)?.setValue(`${day}.${month}.${d.getFullYear()}`);
  }

  onFileSelected(event: FileSelectEvent, controlName: 'mainImageUrl' | 'resourceFileUrl'): void {
    const file: File = event.files?.[0];
    if (!file) return;

    const isImage = controlName === 'mainImageUrl';
    if (isImage) this.uploadingImage = true;
    else this.uploadingResource = true;

    this.projectService.uploadFile(file, isImage ? 'image' : 'resource').subscribe({
      next: (res) => {
        this.form.patchValue({ [controlName]: res.url });
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

  closeModal(): void {
    this.ref.close(false);
  }

  onUpdate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const reason = this.form.errors?.['endBeforeStart']
        ? 'Bitiş tarihi başlangıçtan önce olamaz.'
        : 'Lütfen formu eksiksiz doldurun.';
      this.messageService.add({ severity: 'warn', summary: 'Uyarı', detail: reason });
      return;
    }

    const v = this.form.value;
    const parseDate = (dateStr: string) => {
      if (!dateStr || dateStr.length < 10) return undefined;
      const parts = dateStr.split('.');
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
    };

    const payload: UpdateProjectModel = {
      id: v.id,
      projectName: v.projectName,
      description: v.description,
      mainImageUrl: v.mainImageUrl,
      resourceFileUrl: v.resourceFileUrl,
      startDate: parseDate(v.startDate) || new Date().toISOString(),
      endDate: parseDate(v.endDate),
      statusId: v.statusId,
      ownerId: v.ownerId,
    };

    this.saving = true;
    this.projectService.updateProject(payload).subscribe({
      next: () => {
        const selectedWorkerIds = (v.workerIds ?? []) as string[];
        const uniqueSelected = Array.from(new Set(selectedWorkerIds)).filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id !== v.ownerId,
        );

        const existingIds = new Set(this.existingWorkers.map((w) => w.userId));
        const toAdd = uniqueSelected.filter((id) => !existingIds.has(id));
        const toRemove = this.existingWorkers.filter((w) => !uniqueSelected.includes(w.userId));

        const requests = [
          ...toAdd.map((userId) =>
            this.projectWorkerService.addProjectWorker({
              projectId: v.id,
              userId,
              projectRole: 'Geliştirici',
            }),
          ),
          ...toRemove.map((worker) => this.projectWorkerService.deleteProjectWorker(worker.id)),
        ];

        const workers$ = requests.length ? forkJoin(requests) : of([]);

        workers$.subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Başarılı',
              detail: 'Proje güncellendi.',
            });
            this.saving = false;
            this.ref.close(true);
          },
          error: () => {
            this.messageService.add({
              severity: 'warn',
              summary: 'Uyarı',
              detail: 'Proje güncellendi, çalışanlar senkronize edilemedi.',
            });
            this.saving = false;
            this.ref.close(true);
          },
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Güncelleme başarısız.',
        });
        this.saving = false;
      },
    });
  }
}
