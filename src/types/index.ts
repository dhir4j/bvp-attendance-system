export interface Student {
  rollNumber: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  section: string;
  students: Student[];
  totalLectures: number;
}

export interface StudentAttendance extends Student {
  attended: number;
}

export interface SubjectWithAttendance extends Subject {
  students: StudentAttendance[];
}
