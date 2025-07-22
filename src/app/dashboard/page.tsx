// src/app/dashboard/page.tsx
"use client"

import Link from 'next/link';
import { BookCopy, ChevronRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { StaffAssignmentsResponse } from '@/types';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';

export default function DashboardPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<StaffAssignmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/assignments');
      if (!res.ok) {
        throw new Error("Failed to fetch assignments. Please log in again.");
      }
      const data = await res.json();
      setAssignments(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setAssignments(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  if(isLoading) {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Welcome Back!</h1>
                <p className="text-muted-foreground">Loading your assigned subjects...</p>
            </div>
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-6 w-3/4 bg-muted rounded"></div>
                            <div className="h-4 w-1/2 bg-muted rounded mt-2"></div>
                        </CardHeader>
                        <CardFooter>
                            <div className="h-5 w-1/3 bg-muted rounded"></div>
                        </CardFooter>
                    </Card>
                ))}
             </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome Back!</h1>
        <p className="text-muted-foreground">Select a subject to mark attendance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assignments && assignments.length > 0 ? (
          assignments.map((assignment) => {
            const lectureTypes = Object.keys(assignment.lecture_types).join(', ');
            const assignmentId = `${assignment.subject_id}-${assignment.classroom_id}`;

            return (
              <Link href={`/attendance/${assignmentId}`} key={assignmentId} className="group h-full w-full max-w-sm mx-auto sm:max-w-none sm:mx-0">
                <Card className="hover:border-primary/80 transition-colors h-full flex flex-col hover:shadow-lg">
                  <CardHeader className="flex-grow">
                    <div className="flex items-start gap-4">
                      <BookCopy className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <CardTitle className="text-lg leading-tight">{assignment.subject_name} ({assignment.subject_code})</CardTitle>
                        <CardDescription className="mt-1">
                          {assignment.classroom_name} | Types: {lectureTypes}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter>
                     <div className="flex items-center text-sm font-medium text-primary">
                      Mark Attendance
                      <ChevronRight className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            )
          })
        ) : (
            <div className="col-span-full text-center py-16 text-muted-foreground">
                <p>No subjects assigned to you.</p>
                <p className="text-sm">Please contact an administrator.</p>
            </div>
        )}
      </div>
    </div>
  );
}
