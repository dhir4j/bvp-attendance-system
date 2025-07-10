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
  semester_number: number;
  subject_code: string;
  subject_name: string;
}

export interface Assignment {
  id: number;
  staff_id: number;
  subject_id: number;
  lecture_type: 'TH' | 'PR' | 'TU';
  batch_number: number | null;
  classroom_name: string;
}

// Type for the data returned by /staff/assignments
export interface StaffAssignmentDetails {
    subject_code: string;
    lecture_types: {
        [key: string]: (number | null)[] // e.g. 'TH': [null], 'PR': [1, 2]
    }
}

export type StaffAssignmentsResponse = {
    [subject_id: string]: StaffAssignmentDetails
}
