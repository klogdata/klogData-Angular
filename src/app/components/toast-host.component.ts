import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CircleAlert, CircleCheck, LucideAngularModule, X } from 'lucide-angular';
import { ToastService } from '../shared/toast.service';

const ICONS = { CircleAlert, CircleCheck, X };

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-[220] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:w-full">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto overflow-hidden rounded-2xl border bg-slate-900/95 shadow-2xl backdrop-blur-md toast-enter"
          [ngClass]="toast.variant === 'success' ? 'border-slate-700' : 'border-red-400/30'"
        >
          <div
            class="absolute inset-x-0 top-0 h-0.5"
            [ngClass]="toast.variant === 'success' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500' : 'bg-gradient-to-r from-red-400 to-orange-400'"
          ></div>
          <div class="flex items-start gap-3 px-4 py-3.5 text-slate-100">
            <div
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
              [ngClass]="toast.variant === 'success' ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300' : 'border-red-400/20 bg-red-400/10 text-red-300'"
            >
              <lucide-icon [img]="toast.variant === 'success' ? icons.CircleCheck : icons.CircleAlert" class="h-4.5 w-4.5"></lucide-icon>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium leading-6">{{ toast.title }}</p>
              <p class="mt-1 text-sm leading-6 text-slate-300">{{ toast.message }}</p>
            </div>
            <button
              type="button"
              class="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              (click)="toastService.dismiss(toast.id)"
            >
              <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
              <span class="sr-only">Dismiss</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHostComponent {
  protected readonly icons = ICONS;
  protected readonly toastService = inject(ToastService);
}