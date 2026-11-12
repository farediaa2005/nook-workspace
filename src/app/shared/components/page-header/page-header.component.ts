import { Component, input } from '@angular/core';

/**
 * The page title block (audit/DESIGN_STANDARD.md §4): the page's single <h1> and an optional subtitle.
 * Content projected with the `titleExtra` attribute sits on the title line (e.g. a live-status pill).
 * `spaced` keeps the bottom margin for pages that place the header directly in the page flow;
 * pages that wrap it in their own header row pass [spaced]="false".
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css'
})
export class PageHeaderComponent {
  title = input<string | null | undefined>('');
  subtitle = input<string | null | undefined>('');
  spaced = input<boolean>(true);
}
