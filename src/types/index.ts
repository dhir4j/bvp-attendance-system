
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
// This is now a list of objects, each representing a unique subject-classroom pairing
export interface SubjectAssignment {
    subject_id: number;
    subject_code: string;
    subject_name: string;
    classroom_id: number;
    classroom_name: string;
    batch_id: number | null;
    lecture_types: {
      [key: string]: { // e.g. 'TH', 'PR'
        assignment_id: number;
        batch_number: number | null;
      }[]
    }
}

export type StaffAssignmentsResponse = SubjectAssignment[];

// --- New Types for Student and Batch Management ---

export interface Student {
    id: number;
    roll_no: string;
    enrollment_no: string;
    name: string;
    batch_number: number | null;
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

export interface Defaulter {
  roll_no: string;
  name: string;
  batch_number: number | null;
  lectures_attended: number;
  lectures_held: number;
  attendance_percentage: number;
}
