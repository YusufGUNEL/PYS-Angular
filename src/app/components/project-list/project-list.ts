import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

import { ProjectService } from '../../services/project.service';
import { UserService } from '../../services/user.service';
import { Project, ProjectStatus } from '../../models/project.model';
import { User } from '../../models/user.model';
import { environment } from '../../environments/environment';

import { ProjectUpdateDialogComponent } from '../project-update-dialog/project-update-dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { ProjectDocumentsDialogComponent } from '../project-documents-dialog/project-documents-dialog';
import { ProjectNotesDialogComponent } from '../project-notes-dialog/project-notes-dialog';
import { AuthService } from '../../services/auth.service';
import { statusSeverity, TagSeverity } from '../../shared/project-status';

@Component({
  selector: 'app-project-list',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TooltipModule,
    InputTextModule,
    DatePipe,
  ],
  providers: [MessageService, DialogService],
  templateUrl: './project-list.html',
})
export class ProjectListComponent implements OnInit {
  router = inject(Router);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);
  auth = inject(AuthService);

  projects: Project[] = [];
  users: User[] = [];
  statuses: ProjectStatus[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadProjects();
    this.loadDropdowns();
  }

  loadProjects(): void {
    this.loading = true;
    const source = this.auth.isAdmin()
      ? this.projectService.getProjects()
      : this.projectService.getMyProjects();
    source.subscribe({
      next: (data) => {
        this.projects = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Projeler yüklenemedi:', err);
        const detail =
          err?.status === 0
            ? `Backend'e ulaşılamıyor. API çalışıyor mu? (${environment.apiUrl})`
            : `Projeler yüklenemedi (HTTP ${err?.status ?? '?'}).`;
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadDropdowns(): void {
    if (!this.auth.isAdmin()) return;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.cdr.detectChanges();
      },
    });
    this.projectService.getProjectStatuses().subscribe({
      next: (data) => {
        this.statuses = data;
        this.cdr.detectChanges();
      },
    });
  }

  getStatusSeverity(statusName?: string): TagSeverity {
    return statusSeverity(statusName);
  }

  viewResources(project: Project): void {
    // Tüm proje dokümanlarını galeri dialog'unda göster (foto/pdf/dosya).
    this.dialogService.open(ProjectDocumentsDialogComponent, {
      header: `${project.projectName} — Dokümanlar`,
      width: '760px',
      modal: true,
      data: { projectId: project.id },
    });
  }

  viewNotes(project: Project): void {
    this.dialogService.open(ProjectNotesDialogComponent, {
      header: `${project.projectName} — Kişisel Notlarım`,
      width: '640px',
      modal: true,
      data: { projectId: project.id },
    });
  }

  editProject(project: Project): void {
    const ref = this.dialogService.open(ProjectUpdateDialogComponent, {
      header: 'Projeyi Güncelle',
      width: '720px',
      modal: true,
      data: {
        project: project,
        users: this.users,
        statuses: this.statuses,
      },
    });

    ref?.onClose.subscribe((updated: boolean) => {
      if (updated) this.loadProjects();
    });
  }

  deleteProject(project: Project): void {
    // Tek ortak ConfirmDialog: silme isteği bir Observable olarak iletilir,
    // dialog hem onayı hem servis çağrısını hem de toast'ı kendisi yönetir.
    const ref = this.dialogService.open(ConfirmDialogComponent, {
      header: 'Silme Onayı',
      width: '480px',
      modal: true,
      data: {
        itemLabel: project.projectName,
        itemKindLabel: 'projeyi',
        successMessage: 'Proje silindi.',
        errorMessage: 'Proje silinemedi.',
        action: () => this.projectService.deleteProject(project.id),
      },
    });

    ref?.onClose.subscribe((deleted: boolean) => {
      if (deleted) this.loadProjects();
    });
  }

  approveProject(project: Project): void {
    this.projectService.approveProject(project.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Onaylandı',
          detail: 'Proje başarıyla onaylandı.',
        });
        this.loadProjects();
      },
      error: () =>
        this.messageService.add({ severity: 'error', summary: 'Hata', detail: 'Onay başarısız.' }),
    });
  }

  rejectProject(project: Project): void {
    const ref = this.dialogService.open(ConfirmDialogComponent, {
      header: 'Proje Önerisini Reddet',
      width: '480px',
      modal: true,
      data: {
        itemLabel: project.projectName,
        itemKindLabel: 'proje önerisini reddetmek',
        successMessage: 'Öneri reddedildi.',
        errorMessage: 'Reddetme başarısız.',
        action: () => this.projectService.rejectProject(project.id),
      },
    });

    ref?.onClose.subscribe((deleted: boolean) => {
      if (deleted) this.loadProjects();
    });
  }
}
