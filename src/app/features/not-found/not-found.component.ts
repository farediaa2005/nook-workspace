import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nf-container" [attr.dir]="isArabic() ? 'rtl' : 'ltr'">
      <div class="nf-card">
        <div class="nf-badge">404</div>

        <div class="nf-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="nf-icon">
            <circle cx="12" cy="12" r="10"/>
            <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>

        <h1 class="nf-title">
          {{ t().ui2PageNotFound }}
        </h1>

        <p class="nf-desc">
          {{ t().ui2SorryThePageYouAre }}
        </p>

        <button type="button" class="nf-btn" (click)="goHome()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          @if (signedIn) {
            <span>{{ t().ui2ReturnToDashboard }}</span>
          } @else {
            <span>{{ t().ui2SignIn }}</span>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .nf-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 20%, var(--primary-soft) 0%, transparent 60%),
                  var(--page);
      color: var(--text);
      padding: 24px;
      font-family: inherit;
    }

    .nf-card {
      position: relative;
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: 48px 32px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(16px);
      box-shadow: var(--shadow-lg);
      animation: nfFadeIn 0.35s ease-out;
    }

    @keyframes nfFadeIn {
      from {
        opacity: 0;
        transform: translateY(18px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .nf-badge {
      font-size: 5rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 4px;
      background: linear-gradient(135deg, var(--yellow) 20%, #ff8800 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
      user-select: none;
    }

    .nf-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-soft);
      color: var(--yellow);
      margin-bottom: 20px;
    }

    .nf-icon {
      width: 32px;
      height: 32px;
    }

    .nf-title {
      font-size: var(--fs-2xl);
      font-weight: 700;
      margin: 0 0 10px 0;
      color: var(--text);
    }

    .nf-desc {
      font-size: var(--fs-md);
      color: var(--text-dim);
      line-height: 1.6;
      margin: 0 0 28px 0;
    }

    .nf-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 28px;
      background: linear-gradient(135deg, var(--yellow) 0%, #e5a510 100%);
      color: var(--on-primary);
      font-weight: 700;
      font-size: var(--fs-md);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      box-shadow: var(--shadow-primary);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .nf-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 185, 33, 0.45);
    }

    .nf-btn:active {
      transform: translateY(0);
    }

    .nf-btn svg {
      width: 18px;
      height: 18px;
    }
  `]
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  private readonly langService = inject(LanguageService);
  private readonly authService = inject(AuthService);

  readonly isArabic = this.langService.isArabic;
  readonly t = this.langService.t;
  /** A signed-out visitor is sent to sign in instead of a dashboard they can't open */
  readonly signedIn = this.authService.isAuthenticated();

  goHome(): void {
    this.router.navigate([this.signedIn ? '/dashboard' : '/auth/login']);
  }
}
