"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShieldAlert, Users, Percent, BookOpen } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { StaffAssignmentsResponse, SubjectAssignment, Defaulter } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


export default function DefaultersPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingDefaulters, setIsFetchingDefaulters] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/assignments');
      if (!res.ok) throw new Error("Failed to fetch your assignments.");
      const data: SubjectAssignment[] = await res.json();
      setAssignments(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);
  
  const handleFetchDefaulters = useCallback(async () => {
    if (!selectedSubjectId) {
        toast({ variant: "destructive", title: "Error", description: "Please select a subject." });
        return;
    }
    setIsFetchingDefaulters(true);
    setDefaulters([]);
    try {
        const res = await fetch(`/api/staff/defaulters?subject_id=${selectedSubjectId}`);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to fetch defaulter list.");
        }
        const data: Defaulter[] = await res.json();
        setDefaulters(data);
        if (data.length === 0) {
           toast({ title: "No Defaulters Found", description: "All students meet the attendance criteria for this subject." });
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsFetchingDefaulters(false);
    }

  }, [selectedSubjectId, toast]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Defaulter List</h1>
        <p className="text-muted-foreground">
          Extract students with less than 75% attendance for a subject.
        </p>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Select Subject</CardTitle>
            <CardDescription>Choose the subject to generate the defaulter list for.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
             <div className="space-y-2 flex-grow w-full sm:w-auto">
                <label htmlFor="subject-select" className="text-sm font-medium">Subject</label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger id="subject-select">
                        <SelectValue placeholder="Select a subject..." />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoading ? (
                            <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                        ) : (
                            assignments.map(a => (
                                <SelectItem key={a.subject_id} value={String(a.subject_id)}>
                                    {a.subject_name} ({a.subject_code}) - {a.classroom_name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
             </div>
             <Button onClick={handleFetchDefaulters} disabled={!selectedSubjectId || isFetchingDefaulters} className="w-full sm:w-auto">
                {isFetchingDefaulters ? "Fetching..." : "Get Defaulters"}
             </Button>
          </CardContent>
        </Card>

      {isFetchingDefaulters ? (
        <Card>
          <CardContent className="py-24 text-center">
            <p>Loading defaulter list...</p>
          </CardContent>
        </Card>
      ) : defaulters.length > 0 ? (
         <Card>
            <CardHeader>
                <CardTitle>Defaulter List Results</CardTitle>
                <CardDescription>The following students have below 75% attendance.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Roll Number</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Attended</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Percentage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {defaulters.map(d => (
                            <TableRow key={d.roll_no}>
                                <TableCell className="font-medium">{d.roll_no}</TableCell>
                                <TableCell>{d.name}</TableCell>
                                <TableCell>{d.batch_number || "All"}</TableCell>
                                <TableCell>{d.lectures_attended}</TableCell>
                                <TableCell>{d.lectures_held}</TableCell>
                                <TableCell className="text-destructive font-bold">{d.attendance_percentage}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
         </Card>
      ) : (
        <Card className="flex items-center justify-center py-24">
            <div className="text-center text-muted-foreground">
                <ShieldAlert className="mx-auto h-12 w-12 mb-4" />
                <p className="font-bold">No results</p>
                <p className="text-sm">Select a subject and run the report.</p>
            </div>
        </Card>
      )}
    </div>
  )
}
