import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css'})
export class DataTableComponent {
  columns = input<string[]>([]);
}
