import { Component, input, signal, computed, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';

export interface MetricBadge {
  text: string;
  type?: 'green' | 'blue' | 'purple' | 'yellow' | 'red' | 'default';
}

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.css'
})
export class MetricCardComponent implements OnInit {
  private langService = inject(LanguageService);
  isArabic = this.langService.isArabic;

  title = input.required<string>();
  description = input<string | undefined>(undefined);
  value = input<string | number | undefined>(undefined);
  color = input<'yellow' | 'green' | 'blue' | 'purple' | 'red'>('yellow');
  badge = input<MetricBadge | undefined>(undefined);
  routerLink = input<string | any[] | undefined>(undefined);

  displayValue = signal<string>('');

  isTextValue = computed(() => {
    const val = String(this.value() ?? '');
    return /[a-zA-Z\u0600-\u06FF]/.test(val);
  });

  constructor() {
    effect(() => {
      const val = this.value();
      if (val !== undefined && val !== null && val !== '') {
        this.animateCount(String(val));
      } else {
        this.displayValue.set('');
      }
    });
  }

  ngOnInit(): void {
    const val = this.value();
    if (val !== undefined && val !== null && val !== '') {
      this.animateCount(String(val));
    }
  }

  private animateCount(targetStr: string): void {
    if (!targetStr) return;
    const match = targetStr.match(/^([^\d]*)([\d,.]+)(.*)$/);
    if (!match) {
      this.displayValue.set(targetStr);
      return;
    }

    const prefix = match[1] || '';
    const numStr = match[2].replace(/,/g, '');
    const suffix = match[3] || '';
    const targetNum = parseFloat(numStr);

    if (isNaN(targetNum)) {
      this.displayValue.set(targetStr);
      return;
    }

    const duration = 1100;
    const startTime = performance.now();
    const isFloat = numStr.includes('.');

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-out exponential
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = targetNum * ease;

      const formattedNum = isFloat
        ? current.toFixed(1)
        : Math.round(current).toLocaleString();

      this.displayValue.set(`${prefix}${formattedNum}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        this.displayValue.set(targetStr);
      }
    };

    requestAnimationFrame(update);
  }
}
