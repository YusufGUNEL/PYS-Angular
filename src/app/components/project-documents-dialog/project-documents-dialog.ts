import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ProjectDocumentService } from '../../services/project-document.service';
import { ProjectDocument, ProjectDocumentFileType } from '../../models/project.model';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { FileSelectEvent } from 'primeng/fileupload';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-documents-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TooltipModule,
    FileUploadModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './project-documents-dialog.html',
})
export class ProjectDocumentsDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private projectDocumentService = inject(ProjectDocumentService);
  private projectService = inject(ProjectService);
  private auth = inject(AuthService);
  private messageService = inject(MessageService);

  documents: ProjectDocument[] = [];
  loading = true;
  uploading = false;
  selectedFile?: File;
  description = '';
  fileType: ProjectDocumentFileType = 'other';
  projectId = '';

  ngOnInit(): void {
    const projectId: string | undefined = this.config?.data?.projectId;
    if (!projectId) {
      this.loading = false;
      return;
    }
    this.projectId = projectId;
    this.projectDocumentService.getByProjectId(projectId).subscribe({
      next: (data) => {
        this.documents = data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onFileSelect(event: FileSelectEvent): void {
    const file = event?.files?.[0] as File | undefined;
    if (!file) return;
    this.selectedFile = file;
    this.fileType = this.detectFileType(file.name);
  }

  clearFile(): void {
    this.selectedFile = undefined;
    this.fileType = 'other';
  }

  uploadDocument(): void {
    if (!this.selectedFile || !this.projectId) return;
    const current = this.auth.currentUser();
    if (!current?.id) {
      this.messageService.add({ severity: 'warn', summary: 'Uyarı', detail: 'Oturum bulunamadı.' });
      return;
    }

    this.uploading = true;
    const type = this.fileType === 'image' ? 'image' : 'resource';
    this.projectService.uploadFile(this.selectedFile, type).subscribe({
      next: (res) => {
        this.projectDocumentService
          .add({
            projectId: this.projectId,
            fileName: res.fileName,
            fileUrl: res.url,
            description: this.description?.trim() || undefined,
            fileType: this.fileType,
            uploadedById: current.id,
          })
          .subscribe({
            next: () => {
              this.uploading = false;
              this.description = '';
              this.clearFile();
              this.messageService.add({
                severity: 'success',
                summary: 'Başarılı',
                detail: 'Doküman eklendi.',
              });
              this.reload();
            },
            error: (err) => {
              this.uploading = false;
              const detail = err?.error?.message || 'Doküman kaydedilemedi.';
              this.messageService.add({ severity: 'error', summary: 'Hata', detail });
            },
          });
      },
      error: (err) => {
        this.uploading = false;
        const detail = err?.error?.message || 'Dosya yüklenemedi.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      },
    });
  }

  private detectFileType(name: string): ProjectDocumentFileType {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'].includes(ext)) return 'document';
    return 'other';
  }

  private reload(): void {
    this.loading = true;
    this.projectDocumentService.getByProjectId(this.projectId).subscribe({
      next: (data) => {
        this.documents = data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  close(): void {
    this.ref.close();
  }
}
