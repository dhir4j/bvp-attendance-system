export interface Staff {
  id: number;
  username: string;
  full_name: string;
  password?: string; // Only for creation/update
}

export interface Department {
  dept_code: string;
  dept_name: string;
}

export interface Subject {
  id: number;
  course_code: string;
  dept_code: string;
  semester_number: number | string; // Allow string for form input
  subject_code: string;
  subject_name: string;
}

export interface Batch {
  id: number;
  dept_name: string;
  class_number: string;
  academic_year: string;
  semester: number;
  student_count: number;
  students?: Student[];
}

export interface Student {
  id: number;
  roll_no: string;
  enrollment_no: string;
  name: string;
  batch_number: number | null;
}

export interface Assignment {
  id: number;
  staff_id: number;
  staff_name: string;
  subject_id: number;
  subject_name: string;
  batch_id: number;
  batch_name: string;
  lecture_type: 'TH' | 'PR' | 'TU';
  batch_number: number | null;
}

export interface StaffAssignmentDetails {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  batch_id: number;
  batch_name: string;
  lecture_types: {
    [key: string]: (number | null)[];
  };
}

export type StaffAssignmentsResponse = StaffAssignmentDetails[];

export interface AttendanceReport {
  student_id: number;
  name: string;
  roll_no: string;
  attended_lectures: number;
  total_lectures: number;
  percentage: number;
}

export interface StaffAssignmentReport {
    staff_id: number;
    staff_name: string;
    assignments: {
        id: number;
        subject_name: string;
        batch_name: string;
        lecture_type: string;
        batch_number: number | null;
    }[];
}

export interface EditableAttendanceRecord {
  student_id: number;
  name: string;
  roll_no: string;
  status: 'present' | 'absent';
  attended_lectures: number;
  total_lectures: number;
  assignment_id: number;
}

export interface HOD {
  id: number;
  staff_id: number;
  staff_name: string;
  dept_code: string;
  dept_name: string;
  username: string;
}

export interface HistoricalAttendanceData {
  headers: {
    id: string;
    label: string;
  }[];
  students: {
    id: number;
    roll_no: string;
    enrollment_no: string;
    name: string;
    attendance: Record<string, 'P' | 'A' | ''>;
  }[];
}
