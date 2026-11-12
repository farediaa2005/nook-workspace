import { Component, input } from '@angular/core';

export type StatusTone = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';

/**
 * The site's status pill (audit/DESIGN_STANDARD.md §4): a colored dot and a short label on a tinted
 * pill. tone picks the color from the status tokens (--<tone>-soft / --<tone>-line).
 */
@Component({
  selector: 'app-status-badge',
  template: `
    <span class="status-badge" [class]="'status-badge status-badge--' + tone()" [attr.title]="hint() || null">
      @if (dot()) {
        <span class="status-badge__dot" aria-hidden="true"></span>
      }
      <span class="status-badge__text">{{ text() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: 3px var(--space-2-5);
      border-radius: var(--radius-pill);
      border: 1px solid transparent;
      font-size: var(--fs-xs);
      font-weight: 700;
      line-height: 1.4;
      white-space: nowrap;
    }
    .status-badge__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .status-badge--success { color: var(--success); background: var(--success-soft); border-color: var(--success-line); }
    .status-badge--danger  { color: var(--danger);  background: var(--danger-soft);  border-color: var(--danger-line); }
    .status-badge--warning { color: var(--warning); background: var(--warning-soft); border-color: var(--warning-line); }
    .status-badge--info    { color: var(--info);    background: var(--info-soft);    border-color: var(--info-line); }
    .status-badge--primary { color: var(--accent);  background: var(--primary-soft); border-color: var(--primary-line); }
    .status-badge--neutral { color: var(--text-dim); background: var(--surface-2);   border-color: var(--border); }
  `]
})
export class StatusBadgeComponent {
  text = input<string | null | undefined>('');
  tone = input<StatusTone>('neutral');
  dot = input<boolean>(true);
  /** optional tooltip (e.g. the reason behind an "overtime" status) */
  hint = input<string | null | undefined>('');
}
