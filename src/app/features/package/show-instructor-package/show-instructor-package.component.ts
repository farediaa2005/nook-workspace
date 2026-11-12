import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PACKAGE_PAGE_CONFIG, PackagePageBase, PackagePageConfig } from '../package-page.base';

const INSTRUCTOR_PACKAGE_PAGE: PackagePageConfig = {
  type: 'instructor',
  customHours: 20,
  customHourlyRate: 100,
  expiryDays: 60,
  usageHours: 4,
  usageLocation: 'Classroom Hall A',
  usageLocationOnOpen: 'Classroom Hall A',
  usageSessionTitleKey: 'pkgClassroomWorkshop',
  usageSessionAr: 'محاضرة وورشة تدريبية بالقاعة',
  usageSessionEn: 'Classroom Lecture & Lab Session',
  customPassKey: 'pkgpCustomTrainingPassHrs',
  selectMemberKey: 'locSelectAInstructor',
  sellTitleKey: 'pkgSellInstructorPackage',
  selectAtLeastOneKey: 'pkgPleaseSelectAtLeastOne2',
  hasActivePackageKey: 'pkgInstructorHasActivePackage',
  deletePackageOfKey: 'pkgDeleteInstructorPackageOf'
};

@Component({
  selector: 'app-show-instructor-package',
  imports: [PageHeaderComponent, StatusBadgeComponent, ConfirmDialogComponent, FormsModule, PrimaryButtonComponent],
  templateUrl: './show-instructor-package.component.html',
  providers: [{ provide: PACKAGE_PAGE_CONFIG, useValue: INSTRUCTOR_PACKAGE_PAGE }],
  styleUrl: './show-instructor-package.component.css'
})
export class ShowInstructorPackageComponent extends PackagePageBase {}
