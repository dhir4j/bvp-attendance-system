import type { Subject, SubjectWithAttendance } from '@/types';

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
