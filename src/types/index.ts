
export interface Staff {
  id: number;
  username: string;
  full_name: string;
  password?: string; // Only for creation/update
}

export interface Subject {
  id: number;
  course_code: string;
  dept_code: string;
  semester: number;
  subject_code: string;
  subject_name: string;
}

export interface Classroom {
  id: number;
  dept_code: string;
  class_name: string;
  batch_id: number | null;
}

export interface Assignment {
  id: number;
  staff_id: number;
  subject_id: number;
  lecture_type: 'TH' | 'PR' | 'TU';
  batch_number: number | null;
  classroom_id: number;
}

// Type for the data returned by /staff/assignments
// This is now grouped by subject
export interface SubjectAssignmentDetails {
    subject_code: string;
    subject_name: string;
    assignments: {
        assignment_id: number;
        classroom_name: string;
        lecture_types: {
            [key: string]: (number | null)[] // e.g. 'TH': [null], 'PR': [1, 2]
        }
    }[];
}

export type StaffAssignmentsResponse = {
    [subject_id: string]: SubjectAssignmentDetails
}

// --- New Types for Student and Batch Management ---

export interface Student {
    id: number;
    roll_no: string;
    enrollment_no: string;
    name: string;
}

export interface Batch {
    id: number;
    dept_code: string;
    class_name: string;
    academic_year: string;
    semester: number;
    student_count?: number;
    students?: Student[];
}
