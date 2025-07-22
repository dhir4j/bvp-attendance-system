// src/app/attendance/[assignmentId]/page.tsx
"use client"
import { AttendanceSheet } from '@/components/app/AttendanceSheet';
import { StaffAssignmentsResponse } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

export default function AttendancePage({ params }: { params: { assignmentId: string } }) {
  const { toast } = useToast();
  const router = useRouter();
  const [assignments, setAssignments] = useState<StaffAssignmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/assignments');
      if (!res.ok) {
        if (res.status === 401) {
            toast({ variant: "destructive", title: "Unauthorized", description: "Please log in again." });
            router.push('/');
        }
        throw new Error("Failed to fetch assignments.");
      }
      const data: StaffAssignmentsResponse = await res.json();
      setAssignments(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setAssignments(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast, router]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);
  
  if (isLoading) {
    return <div className="p-6">Loading subject details...</div>;
  }
  
  // The assignmentId from the URL is a composite key, we just pass it down to find the right one.
  const subjectAssignment = assignments?.find(a => `${a.subject_id}-${a.classroom_id}` === params.assignmentId) || null;

  if (!subjectAssignment) {
    notFound();
  }

  return <AttendanceSheet assignment={subjectAssignment} />;
}
