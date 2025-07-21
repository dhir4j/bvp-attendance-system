"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Users, X } from "lucide-react"
import type { SubjectAssignment, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Checkbox } from "../ui/checkbox"

interface AttendanceSheetProps {
  assignmentDetails: SubjectAssignment;
}

export function AttendanceSheet({ assignmentDetails }: AttendanceSheetProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [selectedLectureType, setSelectedLectureType] = useState<string>("")
  const [selectedBatchAssignment, setSelectedBatchAssignment] = useState<{assignment_id: number, batch_number: number | null} | null>(null);

  const [students, setStudents] = useState<Student[]>([])
  const [absentRolls, setAbsentRolls] = useState<Set<string>>(new Set())

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStudentListLoading, setIsStudentListLoading] = useState(false);

  // Determine available lecture types (TH, PR, TU)
  const lectureTypes = useMemo(() => {
    return Object.keys(assignmentDetails.lecture_types)
  }, [assignmentDetails.lecture_types])

  // Determine available batches for the selected lecture type
  const batchAssignments = useMemo(() => {
    return selectedLectureType ? assignmentDetails.lecture_types[selectedLectureType] : []
  }, [selectedLectureType, assignmentDetails.lecture_types])


  // Fetch students when a batch is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (assignmentDetails.batch_id && selectedBatchAssignment) {
        setIsStudentListLoading(true);
        setStudents([]);
        
        const batchNum = selectedBatchAssignment.batch_number;
        let url = `/api/staff/batches/${assignmentDetails.batch_id}/students`;
        if (batchNum !== null) {
          url += `?batch_number=${batchNum}`;
        }
        
        try {
          const res = await fetch(url)
          if(res.ok) {
            const data = await res.json();
            setStudents(data);
          } else {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch student list." });
          }
        } catch (error: any) {
           toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsStudentListLoading(false);
        }
      }
    }
    fetchStudents();
  }, [assignmentDetails.batch_id, selectedBatchAssignment, toast])


  const handleToggleAbsent = (roll_no: string) => {
    setAbsentRolls(prev => {
        const newSet = new Set(prev);
        if (newSet.has(roll_no)) {
            newSet.delete(roll_no);
        } else {
            newSet.add(roll_no);
        }
        return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
      if (checked) {
          setAbsentRolls(new Set());
      } else {
          setAbsentRolls(new Set(students.map(s => s.roll_no)));
      }
  }

  const allPresent = absentRolls.size === 0;

  const handleSubmit = async () => {
    if(!selectedBatchAssignment || !selectedLectureType) {
        toast({ variant: "destructive", title: "Error", description: "Please select a lecture type and batch/theory."});
        return;
    }
    
    setIsLoading(true);

    const body = {
        assignment_id: selectedBatchAssignment.assignment_id,
        lecture_type: selectedLectureType,
        batch_number: selectedBatchAssignment.batch_number,
        absent_rolls: Array.from(absentRolls),
    }

    try {
        const res = await fetch("/api/staff/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const resData = await res.json().catch(() => ({error: "An unknown error occurred."}));
            throw new Error(resData.error || `Failed to submit attendance.`);
        }
        
        setShowSuccessDialog(true);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message});
    } finally {
        setIsLoading(false);
    }
  }

  const handleDialogClose = () => {
    setShowSuccessDialog(false);
    router.push('/dashboard');
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">{assignmentDetails.subject_name}</h1>
          <p className="text-muted-foreground">Class: {assignmentDetails.classroom_name} ({assignmentDetails.subject_code})</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Select the lecture type and batch for this session.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Lecture Type</Label>
              <Select value={selectedLectureType} onValueChange={v => {setSelectedLectureType(v); setSelectedBatchAssignment(null);}}>
                <SelectTrigger><SelectValue placeholder="Select lecture type" /></SelectTrigger>
                <SelectContent>
                  {lectureTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label>Batch / Theory</Label>
                <Select 
                    value={selectedBatchAssignment ? String(selectedBatchAssignment.assignment_id) : ""} 
                    onValueChange={val => {
                        const found = batchAssignments.find(b => String(b.assignment_id) === val);
                        setSelectedBatchAssignment(found || null);
                    }}
                    disabled={!selectedLectureType}
                >
                    <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
                    <SelectContent>
                    {batchAssignments.map((b) => (
                        <SelectItem key={b.assignment_id} value={String(b.assignment_id)}>
                           {b.batch_number ? `Batch ${b.batch_number}` : "Theory (Full Class)"}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mark Absentees</CardTitle>
            <CardDescription>
              {students.length > 0 
                ? "Uncheck the box for any absent students. Everyone is marked present by default."
                : "Select a session to see the student list."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isStudentListLoading ? (
                <p>Loading students...</p>
             ) : students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={allPresent}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all students as present/absent"
                        />
                      </TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => (
                      <TableRow key={student.id} data-state={absentRolls.has(student.roll_no) ? 'selected' : ''}>
                        <TableCell>
                           <Checkbox
                            checked={!absentRolls.has(student.roll_no)}
                            onCheckedChange={() => handleToggleAbsent(student.roll_no)}
                            id={`student-${student.id}`}
                           />
                        </TableCell>
                        <TableCell className="font-medium">{student.roll_no}</TableCell>
                        <TableCell>{student.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No students to display.</p>
                  <p className="text-sm">Please select a session or check the batch configuration.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 left-0 right-0 mt-6 bg-card/80 backdrop-blur-sm border-t p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground" />
            <span className="font-medium">{absentRolls.size}</span>
            <span className="text-muted-foreground">student(s) marked absent</span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !selectedBatchAssignment}>
              {isLoading ? 'Submitting...' : 'Submit Attendance'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md text-center p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold font-headline">Attendance Recorded!</h3>
            <p className="mt-2 text-muted-foreground">
                Attendance has been successfully saved to the database.
            </p>
            <Button onClick={handleDialogClose} className="mt-6 w-full">
                Done
            </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
