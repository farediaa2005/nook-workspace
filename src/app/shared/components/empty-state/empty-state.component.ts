import { Component, input, output } from '@angular/core';
import { PrimaryButtonComponent } from '../primary-button/primary-button.component';

export type EmptyStateIcon = 'info' | 'check' | 'box' | 'bell' | 'search' | 'calendar' | 'users' | 'none';

/**
 * The site's "nothing here" block (audit/DESIGN_STANDARD.md §4): icon, title, optional message and
 * optional action button. Used inside table cells, cards and panels.
 */
@Component({
  selector: 'app-empty-state',
  imports: [PrimaryButtonComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css'
})
export class EmptyStateComponent {
  title = input<string>('');
  message = input<string>('');
  icon = input<EmptyStateIcon>('info');
  /** tone of the icon: neutral (default) or success (e.g. "nobody blocked") */
  tone = input<'neutral' | 'success'>('neutral');
  actionLabel = input<string>('');
  /** compact = less vertical padding (inside small panels) */
  compact = input<boolean>(false);
  action = output<void>();
}
