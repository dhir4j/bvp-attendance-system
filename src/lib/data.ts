import type { Staff, StaffSubjectAssignment, Subject, SubjectWithAttendance } from '@/types';

export const staff: Staff[] = [
  { id: 'staff-1', name: 'Albus Dumbledore', email: 'dumbledore@bvp.edu' },
  { id: 'staff-2', name: 'Minerva McGonagall', email: 'mcgonagall@bvp.edu' },
  { id: 'staff-3', name: 'Severus Snape', email: 'snape@bvp.edu' },
  { id: 'staff-4', name: 'Filius Flitwick', email: 'flitwick@bvp.edu' },
];

export const subjects: Subject[] = [
  {
    id: 'cs-301',
    name: 'Computer Networks',
    section: 'A',
    students: Array.from({ length: 45 }, (_, i) => ({
      rollNumber: `2K22/A/${String(i + 1).padStart(2, '0')}`,
      name: `Student ${i + 1}`,
    })),
    totalLectures: 20
  },
  {
    id: 'cs-302',
    name: 'Database Management',
    section: 'B',
    students: Array.from({ length: 50 }, (_, i) => ({
      rollNumber: `2K22/B/${String(i + 1).padStart(2, '0')}`,
      name: `Student ${i + 1}`,
    })),
    totalLectures: 22
  },
  {
    id: 'cs-303',
    name: 'Operating Systems',
    section: 'A',
    students: Array.from({ length: 45 }, (_, i) => ({
      rollNumber: `2K22/A/${String(i + 1).padStart(2, '0')}`,
      name: `Student ${i + 1}`,
    })),
    totalLectures: 18
  },
  {
    id: 'ec-305',
    name: 'Digital Circuits',
    section: 'C',
    students: Array.from({ length: 48 }, (_, i) => ({
      rollNumber: `2K22/C/${String(i + 1).padStart(2, '0')}`,
      name: `Student ${i + 1}`,
    })),
    totalLectures: 25
  },
];

export const assignments: StaffSubjectAssignment[] = [
    { staffId: 'staff-3', subjectId: 'cs-301' },
    { staffId: 'staff-2', subjectId: 'cs-302' },
    { staffId: 'staff-1', subjectId: 'cs-303' },
];


export const subjectsWithAttendance: SubjectWithAttendance[] = subjects.map(subject => ({
  ...subject,
  students: subject.students.map(student => ({
    ...student,
    attended: Math.floor(Math.random() * (subject.totalLectures - subject.totalLectures * 0.4)) + Math.floor(subject.totalLectures * 0.4) // Random attendance between 40% and totalLectures
  }))
}));

export const getSubjectById = (id: string): Subject | undefined => {
  return subjects.find(subject => subject.id === id);
}

export const getSubjectWithAttendanceById = (id: string): SubjectWithAttendance | undefined => {
    return subjectsWithAttendance.find(subject => subject.id === id);
}
