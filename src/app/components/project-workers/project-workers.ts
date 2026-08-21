import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

import { ProjectWorker } from '../../models/project-worker.model';
import { statusSeverity, TagSeverity } from '../../shared/project-status';
import { ProjectWorkerService } from '../../services/project-worker.service';

@Component({
  selector: 'app-project-workers',
  imports: [FormsModule, ToastModule, InputTextModule, TagModule],
  providers: [MessageService],
  templateUrl: './project-workers.html',
  styleUrl: './project-workers.css',
})
export class ProjectWorkersComponent implements OnInit {
  private projectWorkerService = inject(ProjectWorkerService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  workerSummaries: WorkerSummary[] = [];
  filteredSummaries: WorkerSummary[] = [];
  searchText = '';
  loading = true;

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers(): void {
    this.loading = true;
    this.projectWorkerService.getProjectWorkers().subscribe({
      next: (data) => {
        this.workerSummaries = this.groupByUser(data);
        this.filteredSummaries = this.workerSummaries;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Çalışan verileri yüklenemedi.',
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Kart grid'inde basit metin filtresi (tüm searchText alanlarında arar).
  onSearchChange(): void {
    const q = (this.searchText || '').toLocaleLowerCase('tr-TR').trim();
    if (!q) {
      this.filteredSummaries = this.workerSummaries;
      return;
    }
    this.filteredSummaries = this.workerSummaries.filter((w) =>
      w.searchText.toLocaleLowerCase('tr-TR').includes(q),
    );
  }

  private groupByUser(workers: ProjectWorker[]): WorkerSummary[] {
    const map = new Map<string, WorkerSummary>();

    for (const worker of workers) {
      if (!worker.user?.id) continue;

      const userId = worker.user.id;
      const existing = map.get(userId);
      const summary = existing ?? {
        userId,
        fullName: worker.user.fullName,
        title: worker.user.title,
        projectItems: [],
        searchText: '',
      };

      const projectId = worker.project?.id ?? worker.projectId;
      if (projectId) {
        const already = summary.projectItems.some(
          (item) => item.id === projectId && item.role === worker.projectRole,
        );
        if (!already) {
          summary.projectItems.push({
            id: projectId,
            name: worker.project?.projectName ?? '—',
            status: worker.project?.status?.statusName,
            role: worker.projectRole || '—',
          });
        }
      }

      map.set(userId, summary);
    }

    const summaries = Array.from(map.values());
    for (const summary of summaries) {
      const projectNames = summary.projectItems.map((item) => item.name).join(' ');
      const roles = summary.projectItems.map((item) => item.role).join(' ');
      const statuses = summary.projectItems.map((item) => item.status ?? '').join(' ');
      summary.searchText = [summary.fullName, summary.title ?? '', projectNames, roles, statuses]
        .join(' ')
        .trim();
    }

    return summaries.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  getStatusSeverity(statusName?: string): TagSeverity {
    return statusSeverity(statusName);
  }
}

interface WorkerSummary {
  userId: string;
  fullName: string;
  title?: string;
  projectItems: ProjectItem[];
  searchText: string;
}

interface ProjectItem {
  id: string;
  name: string;
  status?: string;
  role: string;
}
