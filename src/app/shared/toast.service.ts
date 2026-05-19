import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error';

export type ToastItem = {
  duration: number;
  id: number;
  message: string;
  title: string;
  variant: ToastVariant;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  private nextId = 1;

  success(message: string, title = 'Success', duration = 5000) {
    this.pushToast({ duration, message, title, variant: 'success' });
  }

  error(message: string, title = 'Something went wrong', duration = 5000) {
    this.pushToast({ duration, message, title, variant: 'error' });
  }

  dismiss(id: number) {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private pushToast(toast: Omit<ToastItem, 'id'>) {
    const id = this.nextId;
    this.nextId += 1;

    this.toasts.update((items) => [...items, { id, ...toast }]);
    window.setTimeout(() => this.dismiss(id), toast.duration);
  }
}