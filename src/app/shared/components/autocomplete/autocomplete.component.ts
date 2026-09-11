import { Component, Input, Output, EventEmitter, signal, ElementRef, HostListener, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
  data?: any;
}

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="autocomplete-container" [class.autocomplete-container--open]="isOpen()">
      @if (label) {
        <label class="autocomplete-label">{{ label }}</label>
      }
      <div class="autocomplete-input-wrap">
        @if (leadingIcon) {
          <svg class="leading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        }
        <input
          type="text"
          class="autocomplete-input"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [ngModel]="query()"
          (ngModelChange)="onQueryChange($event)"
          (focus)="onFocus()"
          (keydown)="onKeyDown($event)"
        />
        @if (isLoading()) {
          <span class="loading-spinner"></span>
        } @else if (query()) {
          <button type="button" class="btn-clear" (click)="clearSelection($event)" aria-label="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        }
      </div>

      @if (isOpen()) {
        <div class="autocomplete-dropdown" (mousedown)="$event.preventDefault()">
          @if (options().length > 0) {
            @for (opt of options(); track opt.id; let idx = $index) {
              <div
                class="autocomplete-item"
                [class.autocomplete-item--highlighted]="idx === highlightedIndex()"
                (click)="selectItem(opt)"
              >
                <div class="item-label">{{ opt.label }}</div>
                @if (opt.sublabel) {
                  <div class="item-sublabel">{{ opt.sublabel }}</div>
                }
              </div>
            }
          } @else if (!isLoading() && query().trim().length >= minSearchLength) {
            <div class="autocomplete-empty">
              {{ emptyText }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .autocomplete-container {
      position: relative;
      width: 100%;
    }
    .autocomplete-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary, #6b7280);
      margin-bottom: 6px;
    }
    .autocomplete-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .leading-icon {
      position: absolute;
      left: 12px;
      width: 16px;
      height: 16px;
      color: var(--text-dim, #9ca3af);
      pointer-events: none;
    }
    [dir="rtl"] .leading-icon {
      left: auto;
      right: 12px;
    }
    .autocomplete-input {
      width: 100%;
      height: 42px;
      padding: 0 36px 0 36px;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      font-size: 0.92rem;
      color: var(--text-color, #1f2937);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .autocomplete-input:focus {
      border-color: var(--primary-color, #f5b921);
      box-shadow: 0 0 0 3px rgba(245, 185, 33, 0.15);
    }
    .btn-clear {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-dim, #9ca3af);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    [dir="rtl"] .btn-clear {
      right: auto;
      left: 10px;
    }
    .btn-clear:hover {
      color: var(--text-color, #1f2937);
      background: var(--bg-hover, #f3f4f6);
    }
    .btn-clear svg {
      width: 14px;
      height: 14px;
    }
    .loading-spinner {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-color, #e5e7eb);
      border-top-color: var(--primary-color, #f5b921);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    [dir="rtl"] .loading-spinner {
      right: auto;
      left: 12px;
    }
    @keyframes spin {
      to { transform: translateY(-50%) rotate(360deg); }
    }
    .autocomplete-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 1000;
      max-height: 220px;
      overflow-y: auto;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .autocomplete-item {
      padding: 10px 14px;
      cursor: pointer;
      transition: background-color 0.12s ease;
    }
    .autocomplete-item:hover, .autocomplete-item--highlighted {
      background-color: var(--bg-hover, #f3f4f6);
    }
    .item-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-color, #1f2937);
    }
    .item-sublabel {
      font-size: 0.78rem;
      color: var(--text-secondary, #6b7280);
      margin-top: 2px;
    }
    .autocomplete-empty {
      padding: 12px 14px;
      font-size: 0.85rem;
      color: var(--text-secondary, #6b7280);
      text-align: center;
    }
  `]
})
export class AutocompleteComponent implements OnInit, OnChanges {
  private elementRef = inject(ElementRef);

  @Input() label?: string;
  @Input() placeholder: string = 'Search...';
  @Input() value?: string;
  @Input() disabled: boolean = false;
  @Input() leadingIcon: boolean = true;
  @Input() minSearchLength: number = 1;
  @Input() emptyText: string = 'No results found';
  @Input() fetchFn?: (term: string) => Observable<AutocompleteOption[]>;

  @Output() selected = new EventEmitter<AutocompleteOption>();
  @Output() cleared = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();

  query = signal<string>('');
  options = signal<AutocompleteOption[]>([]);
  isLoading = signal<boolean>(false);
  isOpen = signal<boolean>(false);
  highlightedIndex = signal<number>(-1);

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    if (this.value) {
      this.query.set(this.value);
    }

    this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term || term.trim().length < this.minSearchLength || !this.fetchFn) {
          this.isLoading.set(false);
          return of([]);
        }
        this.isLoading.set(true);
        return this.fetchFn(term).pipe(
          catchError(() => {
            this.isLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe((results) => {
      this.isLoading.set(false);
      const seen = new Set<string>();
      const deduplicated: AutocompleteOption[] = [];
      for (const item of results) {
        const key = (item.id || item.label).trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(item);
        }
      }
      this.options.set(deduplicated);
      this.highlightedIndex.set(-1);
      this.isOpen.set(true);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && changes['value'].currentValue !== undefined) {
      this.query.set(changes['value'].currentValue || '');
    }
  }

  onQueryChange(val: string): void {
    this.query.set(val);
    this.valueChange.emit(val);
    this.searchSubject.next(val);
  }

  onFocus(): void {
    if (this.query().trim().length >= this.minSearchLength && this.options().length > 0) {
      this.isOpen.set(true);
    }
  }

  selectItem(opt: AutocompleteOption): void {
    this.query.set(opt.label);
    this.valueChange.emit(opt.label);
    this.selected.emit(opt);
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.query.set('');
    this.options.set([]);
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
    this.valueChange.emit('');
    this.cleared.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    const opts = this.options();
    if (opts.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (this.highlightedIndex() + 1) % opts.length;
      this.highlightedIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (this.highlightedIndex() - 1 + opts.length) % opts.length;
      this.highlightedIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.highlightedIndex();
      if (idx >= 0 && idx < opts.length) {
        this.selectItem(opts[idx]);
      }
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
      this.highlightedIndex.set(-1);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
