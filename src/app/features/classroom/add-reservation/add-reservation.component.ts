import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-add-reservation',
  standalone: true,
  imports: [],
  templateUrl: './add-reservation.component.html',
  styleUrl: './add-reservation.component.css'
})
export class AddReservationComponent implements OnInit {
  private langService = inject(LanguageService);
  private router = inject(Router);

  t = this.langService.t;

  ngOnInit(): void {
    this.router.navigate(['/classroom/add-classroom']);
  }
}
