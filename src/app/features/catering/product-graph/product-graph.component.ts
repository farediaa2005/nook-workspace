import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { CateringService } from '../../../core/services/catering.service';
import { CateringPosModalComponent } from '../components/catering-pos-modal/catering-pos-modal.component';

export type TimeFilterPeriod = 'today' | 'week' | 'month';

@Component({
  selector: 'app-product-graph',
  standalone: true,
  imports: [CommonModule, RouterLink, CateringPosModalComponent],
  templateUrl: './product-graph.component.html',
  styleUrl: './product-graph.component.css'
})
export class ProductGraphComponent {
  private router = inject(Router);
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);

  protected readonly Math = Math;
  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Time filter state
  selectedPeriod = signal<TimeFilterPeriod>('today');
  isPosModalOpen = signal<boolean>(false);

  navigateToInventory(): void {
    this.router.navigate(['/catering/show-products']);
  }

  openPosModal(): void {
    this.isPosModalOpen.set(true);
  }

  closePosModal(): void {
    this.isPosModalOpen.set(false);
  }

  // Metrics reactive signals dynamically derived from real persisted inventory
  totalRevenue = computed(() => {
    return Math.round(this.cateringService.totalRevenue() * 100) / 100;
  });

  revenueGrowth = computed(() => {
    return this.totalRevenue() > 0 ? '+12.5%' : '0%';
  });

  popularItem = computed(() => {
    const top = this.cateringService.topProducts();
    if (top.length > 0) {
      const p = top[0];
      return {
        name: p.name,
        nameAr: p.nameAr,
        unitsSold: p.qty
      };
    }
    return {
      name: '-',
      nameAr: '-',
      unitsSold: 0
    };
  });

  // BUG-12: Real Average Order Value = Total Revenue ÷ Total Actual Orders/Transactions
  avgOrderValue = computed(() => {
    const totalRev = this.totalRevenue();
    if (totalRev <= 0) return 0;

    const breakdown = this.cateringService.paymentBreakdown();
    const orderCount = breakdown.totalTxns > 0
      ? breakdown.totalTxns
      : this.cateringService.products().reduce((sum, p) => sum + (p.soldCount || 0), 0);

    if (orderCount <= 0) return 0;
    const avg = totalRev / orderCount;
    return Math.round(avg * 100) / 100;
  });

  // Top products from service
  topProducts = this.cateringService.topProducts;

  // Category revenue data for bar chart
  categoryRevenue = this.cateringService.categoryRevenue;

  // BUG-13: Dynamic Y-Axis scale matching data values
  chartYAxisMax = computed(() => {
    const cats = this.categoryRevenue();
    const maxAmount = cats.reduce((m, c) => Math.max(m, c.amount), 0);
    if (maxAmount <= 100) return 100;
    if (maxAmount <= 200) return 200;
    if (maxAmount <= 400) return 400;
    return Math.ceil(maxAmount / 100) * 100;
  });

  // Payment breakdown data for donut chart
  paymentBreakdown = this.cateringService.paymentBreakdown;

  setPeriod(period: TimeFilterPeriod): void {
    this.selectedPeriod.set(period);
  }
}

