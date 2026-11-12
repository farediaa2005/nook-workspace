import { Component, computed, inject, input, output } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';
import { PrimaryButtonComponent } from '../primary-button/primary-button.component';

/**
 * The site's confirmation dialog (audit/DESIGN_STANDARD.md §4): icon, title, message, optional details
 * (projected content) and cancel / confirm buttons from the shared button. Labels default to the
 * language file. tone = 'danger' for destructive actions (red icon + red confirm button).
 * Closing: cancel button, the × icon, a click on the backdrop, or Escape (handled app-wide).
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [PrimaryButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  private lang = inject(LanguageService);

  isOpen = input<boolean>(false);
  title = input<string>('');
  message = input<string>('');
  tone = input<'danger' | 'default'>('danger');
  confirmLabel = input<string>('');
  cancelLabel = input<string>('');
  /** While true the confirm button shows a spinner and both buttons are blocked */
  loading = input<boolean>(false);

  confirm = output<void>();
  cancelled = output<void>();

  readonly confirmText = computed(() => this.confirmLabel() || this.lang.t().delete);
  readonly cancelText = computed(() => this.cancelLabel() || this.lang.t().cancel);

  onBackdrop(): void {
    if (!this.loading()) this.cancelled.emit();
  }
}
