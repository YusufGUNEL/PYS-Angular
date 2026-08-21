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
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

import { UserService } from '../../services/user.service';
import { ChatService } from '../../services/chat.service';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-new-group-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './new-group-dialog.html',
})
export class NewGroupDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private auth = inject(AuthService);
  private ref = inject(DynamicDialogRef);

  form: FormGroup;
  users: User[] = [];
  saving = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      memberIds: [[] as string[], [Validators.required, this.minSelectedArray(1)]],
    });
  }

  private minSelectedArray(min: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = Array.isArray(control.value) ? control.value : [];
      return arr.length >= min ? null : { minSelected: { required: min, actual: arr.length } };
    };
  }

  ngOnInit(): void {
    this.chatService.getDirectory().subscribe({
      next: (data) => {
        // ChatRooms/users zaten benim ID'mi filtreliyor
        this.users = data as User[];
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hata',
          detail: 'Kullanıcılar yüklenemedi.',
        });
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const { name, memberIds } = this.form.getRawValue();
    this.chatService
      .createGroup({ name: name!.trim(), memberIds: memberIds as string[] })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Grup oluşturuldu.',
          });
          this.ref.close({ roomId: res.id });
        },
        error: (err) => {
          this.saving = false;
          const detail = err?.error?.message || 'Grup oluşturulamadı.';
          this.messageService.add({ severity: 'error', summary: 'Hata', detail });
        },
      });
  }

  cancel(): void {
    this.ref.close(null);
  }
}
