import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  CourseDto,
  CreateCourseDto,
  UpdateCourseDto,
  CourseEnrollmentDto,
  EnrollStudentDto,
  CourseSessionDto,
  CreateCourseSessionDto,
  AttendanceDto,
  RecordAttendanceDto,
  CourseFileDto,
  CourseAnnouncementDto,
  CreateCourseAnnouncementDto,
  CourseMaterialsSummaryDto
} from '../../models/course.model';

@Injectable({
  providedIn: 'root'
})
export class CourseApiService extends BaseApiService {
  /** List courses (optionally filtered by instructorId) — GET /api/Courses */
  getCourses(instructorId?: string): Observable<CourseDto[]> {
    const params = instructorId ? { instructorId } : undefined;
    return this.get<ApiResponse<CourseDto[] | { items: CourseDto[] }>>(
      API_ENDPOINTS.COURSES.LIST,
      params
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CourseDto[] })?.items ?? [];
      })
    );
  }

  /** Get course by ID — GET /api/Courses/{id} */
  getCourseById(id: string): Observable<CourseDto> {
    return this.get<ApiResponse<CourseDto>>(
      API_ENDPOINTS.COURSES.BY_ID(id)
    ).pipe(map(extractData));
  }

  /** Create new course — POST /api/Courses */
  createCourse(dto: CreateCourseDto): Observable<CourseDto> {
    return this.post<ApiResponse<CourseDto>>(
      API_ENDPOINTS.COURSES.LIST,
      dto
    ).pipe(map(extractData));
  }

  /** Update course — PUT /api/Courses/{id} */
  updateCourse(id: string, dto: UpdateCourseDto): Observable<CourseDto> {
    return this.put<ApiResponse<CourseDto>>(
      API_ENDPOINTS.COURSES.BY_ID(id),
      dto
    ).pipe(map(extractData));
  }

  /** Delete course — DELETE /api/Courses/{id} */
  deleteCourse(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.COURSES.BY_ID(id)
    ).pipe(map(extractData));
  }

  /** Enroll student in course — POST /api/Courses/{courseId}/enroll */
  enrollStudent(courseId: string, dto: EnrollStudentDto): Observable<CourseEnrollmentDto> {
    return this.post<ApiResponse<CourseEnrollmentDto>>(
      API_ENDPOINTS.COURSES.ENROLL(courseId),
      dto
    ).pipe(map(extractData));
  }

  /** Unenroll student — DELETE /api/Courses/{courseId}/enroll/{studentId} */
  unenrollStudent(courseId: string, studentId: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.COURSES.UNENROLL(courseId, studentId)
    ).pipe(map(extractData));
  }

  /** Get enrolled students — GET /api/Courses/{courseId}/students */
  getCourseStudents(courseId: string): Observable<CourseEnrollmentDto[]> {
    return this.get<ApiResponse<CourseEnrollmentDto[] | { items: CourseEnrollmentDto[] }>>(
      API_ENDPOINTS.COURSES.STUDENTS(courseId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CourseEnrollmentDto[] })?.items ?? [];
      })
    );
  }

  /** Create course session — POST /api/Courses/{courseId}/sessions */
  createCourseSession(courseId: string, dto: CreateCourseSessionDto): Observable<CourseSessionDto> {
    return this.post<ApiResponse<CourseSessionDto>>(
      API_ENDPOINTS.COURSES.SESSIONS(courseId),
      dto
    ).pipe(map(extractData));
  }

  /** Get course sessions — GET /api/Courses/{courseId}/sessions */
  getCourseSessions(courseId: string): Observable<CourseSessionDto[]> {
    return this.get<ApiResponse<CourseSessionDto[] | { items: CourseSessionDto[] }>>(
      API_ENDPOINTS.COURSES.SESSIONS(courseId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CourseSessionDto[] })?.items ?? [];
      })
    );
  }

  /** Record attendance for session — POST /api/Courses/sessions/{sessionId}/attendance */
  recordAttendance(sessionId: string, dto: RecordAttendanceDto): Observable<AttendanceDto[]> {
    return this.post<ApiResponse<AttendanceDto[]>>(
      API_ENDPOINTS.COURSES.ATTENDANCE(sessionId),
      dto
    ).pipe(map(extractData));
  }

  /** Get attendance for session — GET /api/Courses/sessions/{sessionId}/attendance */
  getSessionAttendance(sessionId: string): Observable<AttendanceDto[]> {
    return this.get<ApiResponse<AttendanceDto[] | { items: AttendanceDto[] }>>(
      API_ENDPOINTS.COURSES.ATTENDANCE(sessionId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: AttendanceDto[] })?.items ?? [];
      })
    );
  }

  /** Get student attendance across course — GET /api/Courses/{courseId}/students/{studentId}/attendance */
  getStudentAttendance(courseId: string, studentId: string): Observable<AttendanceDto[]> {
    return this.get<ApiResponse<AttendanceDto[] | { items: AttendanceDto[] }>>(
      API_ENDPOINTS.COURSES.STUDENT_ATTENDANCE(courseId, studentId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: AttendanceDto[] })?.items ?? [];
      })
    );
  }

  /** Upload course material file — POST /api/Courses/{courseId}/files */
  uploadCourseFile(courseId: string, file: File): Observable<CourseFileDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.post<ApiResponse<CourseFileDto>>(
      API_ENDPOINTS.COURSES.FILES(courseId),
      formData
    ).pipe(map(extractData));
  }

  /** Get course files — GET /api/Courses/{courseId}/files */
  getCourseFiles(courseId: string): Observable<CourseFileDto[]> {
    return this.get<ApiResponse<CourseFileDto[] | { items: CourseFileDto[] }>>(
      API_ENDPOINTS.COURSES.FILES(courseId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CourseFileDto[] })?.items ?? [];
      })
    );
  }

  /** Delete course file — DELETE /api/Courses/files/{fileId} */
  deleteCourseFile(fileId: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.COURSES.FILE_BY_ID(fileId)
    ).pipe(map(extractData));
  }

  /** Get materials summary — GET /api/Courses/{courseId}/materials-summary */
  getMaterialsSummary(courseId: string): Observable<CourseMaterialsSummaryDto> {
    return this.get<ApiResponse<CourseMaterialsSummaryDto>>(
      API_ENDPOINTS.COURSES.MATERIALS_SUMMARY(courseId)
    ).pipe(map(extractData));
  }

  /** Create course announcement — POST /api/Courses/{courseId}/announcements */
  createAnnouncement(courseId: string, dto: CreateCourseAnnouncementDto): Observable<CourseAnnouncementDto> {
    return this.post<ApiResponse<CourseAnnouncementDto>>(
      API_ENDPOINTS.COURSES.ANNOUNCEMENTS(courseId),
      dto
    ).pipe(map(extractData));
  }

  /** Get course announcements — GET /api/Courses/{courseId}/announcements */
  getAnnouncements(courseId: string): Observable<CourseAnnouncementDto[]> {
    return this.get<ApiResponse<CourseAnnouncementDto[] | { items: CourseAnnouncementDto[] }>>(
      API_ENDPOINTS.COURSES.ANNOUNCEMENTS(courseId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CourseAnnouncementDto[] })?.items ?? [];
      })
    );
  }
}
