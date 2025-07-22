// src/components/app/AttendanceSheet.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle, Users, X, Loader2, ArrowLeft } from "lucide-react"

import type { StaffAssignmentDetails, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Label } from "../ui/label"
import { Alert, AlertTitle } from "../ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

interface AttendanceSheetProps {
  assignment: StaffAssignmentDetails;
}

export function AttendanceSheet({ assignment }: AttendanceSheetProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [lectureType, setLectureType] = useState<string>("")
  const [batchNumber, setBatchNumber] = useState<string>("")
  const [absentRolls, setAbsentRolls] = useState("")
  
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<{ valid_absentees: Student[], invalid_rolls: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  
  const lectureTypes = Object.keys(assignment.lecture_types);
  const batchesForType = lectureType ? assignment.lecture_types[lectureType] : [];
  const showBatchSelector = lectureType !== 'TH' && batchesForType && batchesForType.length > 0 && batchesForType[0] !== null;

  const handleReview = async () => {
    if(!lectureType) {
        toast({ variant: "destructive", title: "Error", description: "Please select a lecture type."});
        return;
    }
    
    if(showBatchSelector && !batchNumber) {
        toast({ variant: "destructive", title: "Error", description: "Please select a sub-batch for this lecture type."});
        return;
    }

    const absent_rolls_list = absentRolls.split(/[\s,]+/).filter(Boolean);
    if(absent_rolls_list.length === 0) {
        toast({ title: "No Absentees", description: "You have not entered any absent roll numbers. All students will be marked present."});
    }

    setIsReviewing(true);
    setReviewData(null);

    const body = {
        batch_id: assignment.batch_id,
        batch_number: showBatchSelector ? parseInt(batchNumber) : null,
        absent_rolls: absent_rolls_list
    }

    try {
        const res = await fetch("/api/staff/attendance/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || "Failed to validate absentees");
        setReviewData(data);
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        setReviewData(null);
    } finally {
        setIsReviewing(false);
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const body = {
        subject_id: assignment.subject_id,
        batch_id: assignment.batch_id,
        lecture_type: lectureType,
        batch_number: showBatchSelector ? parseInt(batchNumber) : null,
        absent_rolls: reviewData?.valid_absentees.map(s => s.roll_no) || []
    }

    try {
        const res = await fetch("/api/staff/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const resData = await res.json();
        if(!res.ok) {
            throw new Error(resData.error || "Failed to submit attendance");
        }
        setReviewData(null);
        setShowSuccessDialog(true);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message});
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    router.push('/dashboard');
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-headline">{assignment.subject_name} ({assignment.subject_code})</h1>
              <p className="text-muted-foreground">Marking attendance for {assignment.batch_name}.</p>
            </div>
        </div>

        <Card className="shadow-lg animate-slide-up">
            <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Select the session details and enter the roll numbers for all absent students.</CardDescription>
            </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
                <Label className="text-base font-medium">Session Details</Label>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                    <Label htmlFor="lecture-type">Lecture Type</Label>
                    <Select value={lectureType} onValueChange={setLectureType}>
                        <SelectTrigger id="lecture-type">
                        <SelectValue placeholder="Select lecture type" />
                        </SelectTrigger>
                        <SelectContent>
                        {lectureTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                            {type === 'TH' ? 'Theory' : type === 'PR' ? 'Practical' : 'Tutorial'} ({type})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                    {showBatchSelector && (
                        <div className="space-y-2">
                            <Label htmlFor="sub-batch">Sub-Batch Number</Label>
                            <Select value={batchNumber} onValueChange={setBatchNumber}>
                                <SelectTrigger id="sub-batch" disabled={!lectureType}>
                                    <SelectValue placeholder="Select sub-batch" />
                                </SelectTrigger>
                                <SelectContent>
                                {batchesForType.map((batch) => (
                                batch && <SelectItem key={batch} value={String(batch)}>
                                    Batch {batch}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="space-y-4">
                <Label htmlFor="absent-rolls" className="text-base font-medium">Absent Students</Label>
                <Textarea
                    id="absent-rolls"
                    placeholder="Enter roll numbers separated by commas, spaces, or new lines..."
                    value={absentRolls}
                    onChange={(e) => setAbsentRolls(e.target.value)}
                    rows={8}
                    className="text-base"
                />
            </div>

          </CardContent>
            <CardFooter className="flex justify-end">
                 <Button size="lg" onClick={handleReview} disabled={isReviewing || !lectureType || (showBatchSelector && !batchNumber)}>
                    {isReviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Review and Submit
                </Button>
            </CardFooter>
        </Card>
      </div>

      {/* Confirmation Dialog */}
       <Dialog open={!!reviewData} onOpenChange={(isOpen) => !isOpen && setReviewData(null)}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Confirm Attendance Submission</DialogTitle>
                <DialogDescription>Please review the list of absentees before final submission.</DialogDescription>
            </DialogHeader>
            {reviewData?.invalid_rolls && reviewData.invalid_rolls.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning: Invalid Roll Numbers</AlertTitle>
                    <p className="text-sm">
                        The following roll numbers were not found in this batch and will be ignored: 
                        <span className="font-mono p-1 bg-destructive/20 rounded ml-1">{reviewData.invalid_rolls.join(", ")}</span>
                    </p>
                </Alert>
            )}
            <div className="max-h-[50vh] overflow-y-auto my-4">
                <h4 className="font-semibold mb-2">Students to be Marked Absent: {reviewData?.valid_absentees.length ?? 0}</h4>
                {reviewData?.valid_absentees && reviewData.valid_absentees.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Roll No</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Enrollment No</TableHead>
                                <TableHead>Batch No.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviewData.valid_absentees.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.roll_no}</TableCell>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell>{s.enrollment_no}</TableCell>
                                    <TableCell>{s.batch_number ?? "N/A"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No valid roll numbers entered. All students will be marked as present.</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setReviewData(null)}>Back to Edit</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm and Submit
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={handleSuccessDialogClose}>
        <DialogContent className="sm:max-w-md text-center p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold font-headline">Attendance Recorded!</h3>
            <p className="mt-2 text-muted-foreground">
                Attendance has been successfully saved.
            </p>
            <Button onClick={handleSuccessDialogClose} className="mt-6 w-full">
                Done
            </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
