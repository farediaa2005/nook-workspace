import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PACKAGE_PAGE_CONFIG, PackagePageBase, PackagePageConfig } from '../package-page.base';

const STUDENT_PACKAGE_PAGE: PackagePageConfig = {
  type: 'student',
  customHours: 50,
  customHourlyRate: 20,
  expiryDays: 30,
  usageHours: 2,
  usageLocation: 'Study Hall A',
  usageLocationOnOpen: 'Quiet Desk #04',
  usageSessionTitleKey: 'pkgSelfStudySession',
  usageSessionAr: 'جلسة مذاكرة واستخدام مساحة العمل',
  usageSessionEn: 'Workspace Study Session',
  customPassKey: 'pkgpCustomStudyPassHrs',
  selectMemberKey: 'locSelectAStudent',
  sellTitleKey: 'pkgSellStudentPackage',
  selectAtLeastOneKey: 'pkgPleaseSelectAtLeastOne',
  hasActivePackageKey: 'pkgStudentHasActivePackage',
  deletePackageOfKey: 'pkgDeleteStudentPackageOf'
};

@Component({
  selector: 'app-show-student-package',
  imports: [PageHeaderComponent, StatusBadgeComponent, ConfirmDialogComponent, FormsModule, PrimaryButtonComponent],
  templateUrl: './show-student-package.component.html',
  providers: [{ provide: PACKAGE_PAGE_CONFIG, useValue: STUDENT_PACKAGE_PAGE }],
  styleUrl: './show-student-package.component.css'
})
export class ShowStudentPackageComponent extends PackagePageBase {}
