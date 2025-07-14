
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Users, X } from "lucide-react"
import type { SubjectAssignmentDetails, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "../ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

interface AttendanceSheetProps {
  subjectId: number;
  subjectDetails: SubjectAssignmentDetails;
}

export function AttendanceSheet({ subjectId, subjectDetails }: AttendanceSheetProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("")
  const [selectedLectureType, setSelectedLectureType] = useState<string>("")
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string>("")

  const [students, setStudents] = useState<Student[]>([])
  const [absentRolls, setAbsentRolls] = useState<Set<string>>(new Set())

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const selectedAssignment = useMemo(() => {
    return subjectDetails.assignments.find(a => String(a.assignment_id) === selectedAssignmentId)
  }, [selectedAssignmentId, subjectDetails.assignments])

  const lectureTypes = useMemo(() => {
    return selectedAssignment ? Object.keys(selectedAssignment.lecture_types) : []
  }, [selectedAssignment])

  const batches = useMemo(() => {
    return selectedAssignment && selectedLectureType ? selectedAssignment.lecture_types[selectedLectureType] : []
  }, [selectedAssignment, selectedLectureType])

  const batchId = selectedAssignment?.classroom_name; // This needs to be improved to get batch_id

  // Fetch students when assignment (and thus batch) is selected
  useEffect(() => {
    if (selectedAssignment) {
      const fetchStudents = async () => {
        // This is a placeholder, need to get the actual batch_id associated with the classroom
        const temp_batch_id = 1; // You need a way to link classroom to a batch
        // const res = await fetch(`/api/staff/batches/${temp_batch_id}/students`)
        // if(res.ok) {
        //   const data = await res.json();
        //   setStudents(data);
        // }
      }
      // fetchStudents();
    }
  }, [selectedAssignment])


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

  
  const handleSubmit = async () => {
    if(!selectedAssignmentId || !selectedLectureType) {
        toast({ variant: "destructive", title: "Error", description: "Please select a classroom and lecture type."});
        return;
    }
    
    const isBatchRequired = selectedLectureType === 'PR' || selectedLectureType === 'TU';
    if(isBatchRequired && !selectedBatchNumber) {
        toast({ variant: "destructive", title: "Error", description: "Please select a batch for this lecture type."});
        return;
    }
    
    setIsLoading(true);

    const body = {
        assignment_id: parseInt(selectedAssignmentId),
        lecture_type: selectedLectureType,
        batch_number: selectedBatchNumber ? parseInt(selectedBatchNumber) : null,
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
          <h1 className="text-3xl font-bold font-headline">{subjectDetails.subject_name}</h1>
          <p className="text-muted-foreground">Mark attendance for {subjectDetails.subject_code}.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Select the classroom, lecture type, and batch for this session.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
             <div className="space-y-2">
                <Label>Classroom</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                    <SelectTrigger><SelectValue placeholder="Select classroom" /></SelectTrigger>
                    <SelectContent>
                        {subjectDetails.assignments.map((a) => (
                            <SelectItem key={a.assignment_id} value={String(a.assignment_id)}>
                            {a.classroom_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label>Lecture Type</Label>
              <Select value={selectedLectureType} onValueChange={setSelectedLectureType} disabled={!selectedAssignmentId}>
                <SelectTrigger><SelectValue placeholder="Select lecture type" /></SelectTrigger>
                <SelectContent>
                  {lectureTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {batches && batches.length > 0 && batches[0] !== null && (
                 <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Select value={selectedBatchNumber} onValueChange={setSelectedBatchNumber} disabled={!selectedLectureType}>
                        <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                        <SelectContent>
                        {batches.map((batch) => (
                            <SelectItem key={batch} value={String(batch)}>
                                Batch {batch}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mark Absentees</CardTitle>
            <CardDescription>
              {students.length > 0 
                ? "Uncheck the box for any absent students."
                : "Enter roll numbers of absentees, separated by commas or spaces."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col gap-2 mb-4">
                <Label htmlFor="absent-rolls">Absent Roll Numbers</Label>
                <Textarea
                    id="absent-rolls"
                    placeholder="e.g., 2K22/A/01, 2K22/A/05, 2K22/A/12"
                    value={Array.from(absentRolls).join(", ")}
                    onChange={(e) => setAbsentRolls(new Set(e.target.value.split(/[\s,]+/).filter(Boolean)))}
                    rows={5}
                />
             </div>
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
            <Button onClick={handleSubmit} disabled={isLoading}>
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
