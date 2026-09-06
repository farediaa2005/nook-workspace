import { Component, input, output, signal, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.css'
})
export class CustomSelectComponent {
  options = input.required<SelectOption[]>();
  selectedValue = input.required<string>();
  fullWidth = input<boolean>(false);
  size = input<'sm' | 'md' | 'lg'>('md');
  placement = input<'bottom' | 'top' | 'auto'>('auto');
  valueChange = output<string>();

  isOpen = signal<boolean>(false);
  isOpeningUpwards = signal<boolean>(false);

  private el = inject(ElementRef);

  toggle(): void {
    if (!this.isOpen()) {
      this.checkPlacement();
      this.isOpen.set(true);
    } else {
      this.isOpen.set(false);
    }
  }

  private checkPlacement(): void {
    if (this.placement() === 'top') {
      this.isOpeningUpwards.set(true);
      return;
    }
    if (this.placement() === 'bottom') {
      this.isOpeningUpwards.set(false);
      return;
    }
    // Auto detection based on viewport boundary
    if (typeof window !== 'undefined') {
      const rect = this.el.nativeElement.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 200) {
        this.isOpeningUpwards.set(true);
      } else {
        this.isOpeningUpwards.set(false);
      }
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  select(val: string): void {
    this.valueChange.emit(val);
    this.isOpen.set(false);
  }

  isSelected(val: string | number): boolean {
    return String(val) === String(this.selectedValue());
  }

  getSelectedLabel(): string {
    const current = String(this.selectedValue());
    const found = this.options().find(o => String(o.value) === current);
    return found ? found.label : (this.options()[0]?.label || '');
  }
}

