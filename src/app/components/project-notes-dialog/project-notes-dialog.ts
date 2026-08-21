import { Component, OnInit, inject } from '@angular/core';

import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProjectNoteService, ProjectNoteDto } from '../../services/project-note.service';

@Component({
  selector: 'app-project-notes-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, TextareaModule, ToastModule],
  providers: [MessageService],
  templateUrl: './project-notes-dialog.html',
})
export class ProjectNotesDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private noteService = inject(ProjectNoteService);
  private messageService = inject(MessageService);

  projectId = '';
  loading = true;
  saving = false;
  newNote = '';
  notes: ProjectNoteDto[] = [];

  ngOnInit(): void {
    this.projectId = this.config?.data?.projectId ?? '';
    if (!this.projectId) {
      this.loading = false;
      return;
    }
    this.loadNotes();
  }

  private loadNotes(): void {
    this.loading = true;
    this.noteService.getByProjectId(this.projectId).subscribe({
      next: (data) => {
        this.notes = data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  addNote(): void {
    const content = this.newNote.trim();
    if (!content) return;

    this.saving = true;
    this.noteService.add({ projectId: this.projectId, content }).subscribe({
      next: () => {
        this.saving = false;
        this.newNote = '';
        this.messageService.add({
          severity: 'success',
          summary: 'Kaydedildi',
          detail: 'Not eklendi.',
        });
        this.loadNotes();
      },
      error: (err) => {
        this.saving = false;
        const detail = err?.error?.message || 'Not eklenemedi.';
        this.messageService.add({ severity: 'error', summary: 'Hata', detail });
      },
    });
  }

  deleteNote(note: ProjectNoteDto): void {
    this.noteService.delete(note.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Silindi',
          detail: 'Not silindi.',
        });
        this.loadNotes();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Hata', detail: 'Not silinemedi.' });
      },
    });
  }

  close(): void {
    this.ref.close();
  }
}
