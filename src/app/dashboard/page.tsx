"use client"

import Link from 'next/link';
import { BookCopy, ChevronRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import type { StaffAssignmentsResponse } from '@/types';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnrichedAssignment {
  subjectId: string;
  code: string;
  lectureTypes: string;
  name: string;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [enrichedAssignments, setEnrichedAssignments] = useState<EnrichedAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/assignments');
      
      if (!res.ok) {
        throw new Error("Failed to fetch your assignments. Please log in again.");
      }

      const assignments: StaffAssignmentsResponse = await res.json();

      const enriched = Object.entries(assignments).map(([subjectId, assignment]) => ({
        subjectId,
        code: assignment.subject_code,
        lectureTypes: Object.keys(assignment.lecture_types).join(', '),
        name: assignment.subject_name || 'Unknown Subject',
      }));

      setEnrichedAssignments(enriched);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setEnrichedAssignments([]);
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
        {enrichedAssignments.length > 0 ? (
          enrichedAssignments.map((assignment) => {
            return (
              <Link href={`/attendance/${assignment.subjectId}`} key={assignment.subjectId} className="group h-full w-full max-w-sm mx-auto sm:max-w-none sm:mx-0">
                <Card className="hover:border-primary/80 transition-colors h-full flex flex-col hover:shadow-lg">
                  <CardHeader className="flex-grow">
                    <div className="flex flex-col gap-2">
                       <Badge variant="outline" className="w-fit">{assignment.code}</Badge>
                       <CardTitle className="text-lg leading-tight">{assignment.name}</CardTitle>
                       <CardDescription>
                          Types: {assignment.lectureTypes}
                       </CardDescription>
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
