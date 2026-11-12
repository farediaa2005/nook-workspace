import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OperationalAlertSettingsDto, SettingsApiService } from '../../../core/services/api/settings-api.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';

type FieldKey = keyof OperationalAlertSettingsDto;

interface FieldDef {
  key: FieldKey;
  labelAr: string;
  labelEn: string;
  hintAr: string;
  hintEn: string;
  unitAr: string;
  unitEn: string;
  min: number;
}

/**
 * Operational alert thresholds — GET/PUT /api/Settings/operational-alerts.
 * These drive the low-stock, session-ending and long-stay alerts.
 */
@Component({
  selector: 'app-alert-settings',
  standalone: true,
  imports: [FormsModule, PrimaryButtonComponent],
  templateUrl: './alert-settings.component.html',
  styleUrl: './alert-settings.component.css'
})
export class AlertSettingsComponent implements OnInit {
  private api = inject(SettingsApiService);
  private notifications = inject(NotificationService);
  private lang = inject(LanguageService);

  isArabic = this.lang.isArabic;
  t = this.lang.t;

  readonly fields: FieldDef[] = [
    { key: 'cateringWarningThreshold', labelAr: 'تنبيه مخزون الكافيه قليل', labelEn: 'Low catering stock warning', hintAr: 'ينبّه لما كمية أي منتج توصل للرقم ده أو أقل', hintEn: 'Warn when a product quantity reaches this number or less', unitAr: 'قطعة', unitEn: 'pcs', min: 0 },
    { key: 'cateringCriticalThreshold', labelAr: 'تنبيه مخزون الكافيه حرج', labelEn: 'Critical catering stock', hintAr: 'تنبيه أحمر لما الكمية توصل للرقم ده أو أقل', hintEn: 'Red alert when quantity reaches this number or less', unitAr: 'قطعة', unitEn: 'pcs', min: 0 },
    { key: 'sessionWarningLeadMinutes', labelAr: 'تنبيه قرب انتهاء الجلسة', labelEn: 'Session ending soon', hintAr: 'قبل موعد الخروج المتوقع بكام دقيقة', hintEn: 'Minutes before the expected check-out', unitAr: 'دقيقة', unitEn: 'min', min: 1 },
    { key: 'sessionUrgentLeadMinutes', labelAr: 'تنبيه عاجل لانتهاء الجلسة', labelEn: 'Session ending urgently', hintAr: 'لازم يكون أقل من تنبيه قرب الانتهاء', hintEn: 'Must be less than the "ending soon" warning', unitAr: 'دقيقة', unitEn: 'min', min: 1 },
    { key: 'longStayThresholdHours', labelAr: 'تنبيه إقامة طويلة', labelEn: 'Long stay alert', hintAr: 'جلسة مفتوحة من غير موعد خروج أكتر من كام ساعة', hintEn: 'Open session without check-out time longer than', unitAr: 'ساعة', unitEn: 'h', min: 1 },
    { key: 'roomCapacityAlertSeats', labelAr: 'تنبيه امتلاء الروم', labelEn: 'Room almost full', hintAr: 'لما المقاعد الفاضية توصل للرقم ده أو أقل', hintEn: 'When free seats reach this number or less', unitAr: 'مقعد', unitEn: 'seats', min: 0 }
  ];

  readonly values = signal<OperationalAlertSettingsDto | null>(null);
  private original: OperationalAlertSettingsDto | null = null;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly errors = computed<string[]>(() => {
    const v = this.values();
    if (!v) return [];
    const ar = this.isArabic();
    const out: string[] = [];
    for (const f of this.fields) {
      const n = v[f.key];
      if (n === null || n === undefined || !Number.isInteger(Number(n)) || Number(n) < f.min) {
        out.push(ar ? `${f.labelAr}: رقم صحيح ${f.min} أو أكبر` : `${f.labelEn}: whole number ${f.min} or more`);
      }
    }
    if (Number(v.cateringCriticalThreshold) > Number(v.cateringWarningThreshold)) {
      out.push(this.t().locCriticalStockMustBeLess);
    }
    if (Number(v.sessionUrgentLeadMinutes) >= Number(v.sessionWarningLeadMinutes)) {
      out.push(this.t().locTheUrgentWarningMustBe);
    }
    return out;
  });

  readonly isDirty = computed(() => {
    const v = this.values();
    return !!v && !!this.original && this.fields.some(f => Number(v[f.key]) !== Number(this.original![f.key]));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.api.getOperationalAlertSettings().subscribe({
      next: (s) => {
        this.original = { ...s };
        this.values.set({ ...s });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(extractApiErrorMessage(err, this.t().set2CouldNotLoadTheSettings));
      }
    });
  }

  setValue(key: FieldKey, raw: unknown): void {
    const v = this.values();
    if (!v) return;
    const n = raw === '' || raw === null ? NaN : Number(raw);
    this.values.set({ ...v, [key]: n });
  }

  reset(): void {
    if (this.original) this.values.set({ ...this.original });
  }

  save(): void {
    const v = this.values();
    if (!v || this.errors().length || this.isSaving()) return;
    this.isSaving.set(true);
    const payload = Object.fromEntries(this.fields.map(f => [f.key, Math.round(Number(v[f.key]))])) as unknown as OperationalAlertSettingsDto;
    this.api.updateOperationalAlertSettings(payload).subscribe({
      next: (saved) => {
        const result = saved && typeof saved === 'object' ? saved : payload;
        this.original = { ...result };
        this.values.set({ ...result });
        this.isSaving.set(false);
        this.notifications.reloadAlertSettings();
        this.notifications.success(this.t().set2AlertSettingsSaved);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notifications.error((this.t().set2CouldNotSaveTheSettings) + extractApiErrorMessage(err, this.t().resServerError));
      }
    });
  }
}
