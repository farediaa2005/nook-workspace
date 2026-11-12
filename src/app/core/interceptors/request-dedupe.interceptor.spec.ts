import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { clearRequestDedupeCache, requestDedupeInterceptor } from './request-dedupe.interceptor';

describe('requestDedupeInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    clearRequestDedupeCache();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestDedupeInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('shares one request between identical concurrent GETs', () => {
    const results: unknown[] = [];
    http.get('/api/Students').subscribe((r) => results.push(r));
    http.get('/api/Students').subscribe((r) => results.push(r));

    const reqs = ctrl.match('/api/Students');
    expect(reqs.length).toBe(1);
    reqs[0].flush([{ id: 1 }]);
    expect(results).toEqual([[{ id: 1 }], [{ id: 1 }]]);
  });

  it('reuses a fresh GET response, but not after a write', () => {
    http.get('/api/Rooms').subscribe();
    ctrl.expectOne('/api/Rooms').flush([]);

    // Within the reuse window: no new request
    http.get('/api/Rooms').subscribe();
    ctrl.expectNone('/api/Rooms');

    // A write invalidates the window
    http.post('/api/Rooms', {}).subscribe();
    ctrl.expectOne({ method: 'POST', url: '/api/Rooms' }).flush({});
    http.get('/api/Rooms').subscribe();
    ctrl.expectOne('/api/Rooms').flush([]);
  });

  it('does not merge different URLs or query strings', () => {
    http.get('/api/Classrooms', { params: { DateFrom: '2026-11-10' } }).subscribe();
    http.get('/api/Classrooms', { params: { DateFrom: '2026-11-09' } }).subscribe();
    expect(ctrl.match((r) => r.url === '/api/Classrooms').length).toBe(2);
  });
});
