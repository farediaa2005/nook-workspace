import { Component, computed, inject, signal, OnInit } from '@angular/core';
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
export class ProductGraphComponent implements OnInit {
  private router = inject(Router);
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);

  protected readonly Math = Math;
  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Time filter state
  selectedPeriod = signal<TimeFilterPeriod>('today');
  isPosModalOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.cateringService.getProducts().subscribe();
  }

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

  chartYAxisMax = computed(() => {
    const cats = this.categoryRevenue();
    const maxAmount = cats.reduce((m, c) => Math.max(m, c.amount), 0);
    if (maxAmount <= 0) return 100;
    if (maxAmount <= 100) return 100;
    if (maxAmount <= 200) return 200;
    if (maxAmount <= 400) return 400;
    return Math.ceil(maxAmount / 100) * 100;
  });

  // Payment breakdown data for donut chart
  paymentBreakdown = this.cateringService.paymentBreakdown;

  // Real SVG Donut Chart Calculation (Circumference = 2 * PI * 60 ≈ 377)
  readonly donutCircumference = 377;

  donutCardDash = computed(() => {
    const p = this.paymentBreakdown();
    if (p.totalTxns === 0) return `0 ${this.donutCircumference}`;
    const len = Math.round((p.cardPercent / 100) * this.donutCircumference);
    return `${len} ${this.donutCircumference - len}`;
  });

  donutAppDash = computed(() => {
    const p = this.paymentBreakdown();
    if (p.totalTxns === 0) return `0 ${this.donutCircumference}`;
    const len = Math.round((p.appPercent / 100) * this.donutCircumference);
    return `${len} ${this.donutCircumference - len}`;
  });

  donutAppOffset = computed(() => {
    const p = this.paymentBreakdown();
    if (p.totalTxns === 0) return 0;
    const cardLen = Math.round((p.cardPercent / 100) * this.donutCircumference);
    return -cardLen;
  });

  donutCashDash = computed(() => {
    const p = this.paymentBreakdown();
    if (p.totalTxns === 0) return `0 ${this.donutCircumference}`;
    const len = Math.round((p.cashPercent / 100) * this.donutCircumference);
    return `${len} ${this.donutCircumference - len}`;
  });

  donutCashOffset = computed(() => {
    const p = this.paymentBreakdown();
    if (p.totalTxns === 0) return 0;
    const cardLen = Math.round((p.cardPercent / 100) * this.donutCircumference);
    const appLen = Math.round((p.appPercent / 100) * this.donutCircumference);
    return -(cardLen + appLen);
  });

  setPeriod(period: TimeFilterPeriod): void {
    this.selectedPeriod.set(period);
  }
}
