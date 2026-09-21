import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('nook_website');

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const allowedKeys = new Set(['nook_token', 'nook_refresh_token', 'nook_user', 'nook_theme', 'nook_lang']);
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('nook_') && !allowedKeys.has(key)) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
    }
  }
}
