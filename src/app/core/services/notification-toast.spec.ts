import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from './notification.service';

describe('NotificationService toasts', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    try { localStorage.clear(); } catch {}
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps at most 3 toasts on screen and drops the oldest first', () => {
    for (let i = 1; i <= 6; i++) service.warning(`Low stock ${i}`, 0);

    const messages = service.notifications().map((n) => n.message);
    expect(messages).toEqual(['Low stock 4', 'Low stock 5', 'Low stock 6']);
  });

  it('does not stack an identical toast that is already visible', () => {
    service.error('Network error', 0);
    service.error('Network error', 0);
    service.error('Network error', 0);

    expect(service.notifications().length).toBe(1);
  });

  it('allows the same message again after the previous one was dismissed', () => {
    service.success('Saved', 0);
    service.dismiss(service.notifications()[0].id);
    service.success('Saved', 0);

    expect(service.notifications().length).toBe(1);
  });

  it('auto-dismisses a toast after its duration', () => {
    service.info('Hello', 1000);
    expect(service.notifications().length).toBe(1);

    vi.advanceTimersByTime(1001);
    expect(service.notifications().length).toBe(0);
  });
});
