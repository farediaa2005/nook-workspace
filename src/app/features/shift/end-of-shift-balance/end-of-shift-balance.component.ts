import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EndOfShiftModalComponent } from '../../../shared/components/end-of-shift-modal/end-of-shift-modal.component';

@Component({
  selector: 'app-end-of-shift-balance',
  imports: [EndOfShiftModalComponent],
  template: `
    <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
      <app-end-of-shift-modal
        (cancelled)="onCancel()"
        (closed)="onClosed()"
      ></app-end-of-shift-modal>
    </div>
  `
})
export class EndOfShiftBalanceComponent {
  private router = inject(Router);

  onCancel(): void {
    this.router.navigate(['/shift/active']);
  }

  onClosed(): void {
    this.router.navigate(['/shift/history']);
  }
}
