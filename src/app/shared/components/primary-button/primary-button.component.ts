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
  clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    this.clicked.emit(event);
  }
}
