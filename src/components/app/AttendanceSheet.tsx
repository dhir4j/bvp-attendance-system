// src/components/app/AttendanceSheet.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Users, X } from "lucide-react"

import type { StaffAssignmentDetails } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Label } from "../ui/label"

interface AttendanceSheetProps {
  assignment: StaffAssignmentDetails;
}

export function AttendanceSheet({ assignment }: AttendanceSheetProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [lectureType, setLectureType] = useState<string>("")
  const [batchNumber, setBatchNumber] = useState<string>("")
  const [absentRolls, setAbsentRolls] = useState("")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const lectureTypes = Object.keys(assignment.lecture_types);
  const batchesForType = lectureType ? assignment.lecture_types[lectureType] : [];
  // Show batch selector only for PR/TU and if there are sub-batches defined
  const showBatchSelector = lectureType !== 'TH' && batchesForType && batchesForType.length > 0 && batchesForType[0] !== null;

  const handleSubmit = async () => {
    if(!lectureType) {
        toast({ variant: "destructive", title: "Error", description: "Please select a lecture type."});
        return;
    }
    
    if(showBatchSelector && !batchNumber) {
        toast({ variant: "destructive", title: "Error", description: "Please select a sub-batch for this lecture type."});
        return;
    }
    
    setIsLoading(true);

    const absent_rolls = absentRolls.split(/[\s,]+/).filter(Boolean);

    const body = {
        subject_id: assignment.subject_id,
        batch_id: assignment.batch_id,
        lecture_type: lectureType,
        batch_number: showBatchSelector ? parseInt(batchNumber) : null,
        absent_rolls
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
          <h1 className="text-3xl font-bold font-headline">{assignment.subject_name} ({assignment.subject_code})</h1>
          <p className="text-muted-foreground">Marking attendance for {assignment.batch_name}.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Select the lecture type and sub-batch (if applicable).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Lecture Type</Label>
              <Select value={lectureType} onValueChange={setLectureType}>
                <SelectTrigger>
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
                    <Label>Sub-Batch Number</Label>
                    <Select value={batchNumber} onValueChange={setBatchNumber}>
                        <SelectTrigger disabled={!lectureType}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mark Absentees</CardTitle>
            <CardDescription>Enter the roll numbers of all absent students, separated by commas or spaces.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col gap-2 mb-4">
                <Label htmlFor="absent-rolls">Absent Roll Numbers</Label>
                <Textarea
                    id="absent-rolls"
                    placeholder="e.g., 2K22/A/01, 2K22/A/05, 2K22/A/12"
                    value={absentRolls}
                    onChange={(e) => setAbsentRolls(e.target.value)}
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
            <span className="font-medium">{absentRolls.split(/[\s,]+/).filter(Boolean).length}</span>
            <span className="text-muted-foreground">student(s) marked absent</span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !lectureType || (showBatchSelector && !batchNumber)}>
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
                Attendance has been successfully saved.
            </p>
            <Button onClick={handleDialogClose} className="mt-6 w-full">
                Done
            </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
