import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-viewport" [attr.dir]="isArabic() ? 'rtl' : 'ltr'">
      @for (toast of notifications(); track toast.id) {
        <div class="toast-card" [ngClass]="'toast-' + toast.type" role="alert" aria-live="polite">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              }
              @case ('error') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              }
              @case ('warning') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              }
            }
          </div>

          <div class="toast-message">{{ toast.message }}</div>

          <button
            type="button"
            class="toast-close"
            (click)="dismiss(toast.id)"
            aria-label="Close notification"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-viewport {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 440px;
      width: calc(100vw - 40px);
      pointer-events: none;
    }

    [dir='rtl'] .toast-viewport,
    .toast-viewport[dir='rtl'] {
      right: auto;
      left: 20px;
    }

    @media (max-width: 600px) {
      .toast-viewport {
        top: 12px;
        left: 12px;
        right: 12px;
        width: calc(100vw - 24px);
      }
    }

    .toast-card {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      font-size: 14px;
      line-height: 1.45;
      font-weight: 500;
      animation: toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translateY(-16px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .toast-icon {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-icon svg {
      width: 100%;
      height: 100%;
    }

    .toast-message {
      flex: 1;
      word-break: break-word;
    }

    .toast-close {
      background: none;
      border: none;
      color: inherit;
      opacity: 0.7;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: opacity 0.15s ease, background-color 0.15s ease;
    }

    .toast-close:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.15);
    }

    .toast-close svg {
      width: 16px;
      height: 16px;
    }

    /* Toast Variants */
    .toast-success {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
      border-color: rgba(52, 211, 153, 0.4);
    }

    .toast-error {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
      border-color: rgba(248, 113, 113, 0.4);
    }

    .toast-warning {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95));
      border-color: rgba(251, 191, 36, 0.4);
      color: #1a1a1a;
    }
    .toast-warning .toast-close:hover {
      background-color: rgba(0, 0, 0, 0.15);
    }

    .toast-info {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
      border-color: rgba(96, 165, 250, 0.4);
    }
  `]
})
export class ToastContainerComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly langService = inject(LanguageService);

  readonly notifications = this.notificationService.notifications;
  readonly isArabic = this.langService.isArabic;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
