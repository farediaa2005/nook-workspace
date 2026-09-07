/**
 * Course and Classroom Curriculum domain models matching OpenAPI 3.0.4.
 * Endpoints: /api/Courses/* (19 Endpoints)
 */

export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  Excused = 3,
  Late = 4
}

export interface CourseDto {
  id: string;
  name: string;
  description?: string | null;
  reservationId: string;
  instructorId?: string | null;
  instructorName?: string | null;
  isActive: boolean;
  enrolledCount: number;
}

export interface CreateCourseDto {
  name: string;
  description?: string | null;
  reservationId: string;
}

export interface UpdateCourseDto {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface CourseEnrollmentDto {
  id: string;
  courseId: string;
  studentId: string;
  studentName?: string | null;
  enrolledAt: string;
}

export interface EnrollStudentDto {
  studentId: string;
}

export interface CourseSessionDto {
  id: string;
  courseId: string;
  date: string;
  topic?: string | null;
}

export interface CreateCourseSessionDto {
  date: string;
  topic?: string | null;
}

export interface AttendanceDto {
  id: string;
  courseSessionId: string;
  studentId: string;
  studentName?: string | null;
  status: AttendanceStatus;
  note?: string | null;
}

export interface AttendanceEntryDto {
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface RecordAttendanceDto {
  entries: AttendanceEntryDto[];
}

export interface CourseFileDto {
  id: string;
  courseId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedByAccountId?: string | null;
  createdAt: string;
}

export interface CourseAnnouncementDto {
  id: string;
  courseId: string;
  title: string;
  body?: string | null;
  postedByAccountId?: string | null;
  createdAt: string;
}

export interface CreateCourseAnnouncementDto {
  title: string;
  body?: string | null;
}

export interface CourseMaterialsSummaryDto {
  courseId: string;
  fileCount: number;
  totalSizeBytes: number;
}
