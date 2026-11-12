import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-primary-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './primary-button.component.html',
  styleUrl: './primary-button.component.css'
})
export class PrimaryButtonComponent {
  text = input<string>('');
  type = input<'button' | 'submit'>('button');
  fullWidth = input<boolean>(false);
  disabled = input<boolean>(false);
  /** Visual variant (audit/DESIGN_STANDARD.md §4): primary = yellow fill, secondary = outlined, ghost = text-only, danger = red fill */
  variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  /** md = 44px (default), sm = 34px */
  size = input<'md' | 'sm'>('md');
  /** Shows a spinner and blocks clicks while an action is running */
  loading = input<boolean>(false);
  clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    this.clicked.emit(event);
  }
}
