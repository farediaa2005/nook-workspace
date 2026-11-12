import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('nook_website');

  /** Created here so the saved light/dark theme applies on every page, including the ones outside the main
   *  layout (the 404 page always showed dark before, because only the navbar and login created the service). */
  private readonly theme = inject(ThemeService);

  /**
   * Overlays that close their dialog/menu when clicked. Escape closes the topmost
   * visible one the same way, so every modal in the app supports the keyboard.
   */
  private static readonly DISMISSABLE_OVERLAYS = [
    '.modal-overlay', '.modal-backdrop', '.modal-backdrop-custom', '.logout-modal-overlay',
    '.add-item-overlay', '.custom-recurrence-backdrop', '.clock-picker-overlay',
    '.panel-backdrop', '.drawer-backdrop', '.menu-backdrop'
  ].join(', ');

  @HostListener('document:keydown.escape', ['$event'])
  closeTopmostOverlay(event: Event): void {
    if (event.defaultPrevented) return;
    const overlays = Array.from(document.querySelectorAll<HTMLElement>(App.DISMISSABLE_OVERLAYS))
      .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
    const topmost = overlays[overlays.length - 1];
    if (topmost) {
      event.preventDefault();
      topmost.click();
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const allowedKeys = new Set([
          'nook_access_token',
          'nook_token',
          'nook_refresh_token',
          'nook_user_data',
          'nook_user',
          'nook_theme',
          'nook_lang'
        ]);
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('nook_') && !allowedKeys.has(key)) {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      // Uploaded room/product images that the server no longer has (404) are replaced by a
      // neutral placeholder instead of a broken-image icon.
      document.addEventListener('error', (event) => {
        const img = event.target;
        if (img instanceof HTMLImageElement && !img.dataset['fallbackApplied']) {
          img.dataset['fallbackApplied'] = 'true';
          img.src = App.IMAGE_PLACEHOLDER;
        }
      }, true);
    }
  }

  private static readonly IMAGE_PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">' +
      '<rect width="160" height="120" fill="#2a2a2e"/>' +
      '<path d="M52 82l18-22 14 16 10-12 16 18z" fill="#55555c"/>' +
      '<circle cx="62" cy="46" r="8" fill="#55555c"/></svg>'
    );
}
