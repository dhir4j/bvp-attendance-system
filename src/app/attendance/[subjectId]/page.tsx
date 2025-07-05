import { getSubjectById } from '@/lib/data';
import { AttendanceSheet } from '@/components/app/AttendanceSheet';
import { notFound } from 'next/navigation';

export default function AttendancePage({ params }: { params: { subjectId: string } }) {
  const subject = getSubjectById(params.subjectId);

  if (!subject) {
    notFound();
  }

  return <AttendanceSheet subject={subject} />;
}
