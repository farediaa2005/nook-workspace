import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/**
 * Focuses the element once it is rendered (used on the first field of a dialog).
 * Replaces the HTML `autofocus` attribute, which only works on page load and
 * not on fields that appear later inside a dialog.
 */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    setTimeout(() => this.el.nativeElement.focus(), 0);
  }
}
