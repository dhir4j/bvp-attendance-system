// src/app/dashboard/admin/report/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Batch, AttendanceReport, Subject, Student } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileBarChart, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"


interface SubjectIdentifier {
  id: number;
  name: string;
}

export default function ReportPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [subjects, setSubjects] = useState<SubjectIdentifier[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedLectureType, setSelectedLectureType] = useState<string>("")
  const [reportData, setReportData] = useState<AttendanceReport[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)
  
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false)
  const [selectedBatchStudents, setSelectedBatchStudents] = useState<Student[]>([]);

  const fetchBatches = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/batches')
      if (!res.ok) throw new Error("Failed to fetch batches")
      const data = await res.json()
      setBatches(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const fetchSubjectsForBatch = useCallback(async (batchId: string) => {
    if (!batchId) return;
    setIsSubjectsLoading(true);
    setSubjects([]);
    setSelectedSubjectId("");
    try {
      const res = await fetch(`/api/admin/subjects/by-batch/${batchId}`);
      if (!res.ok) throw new Error("Failed to fetch subjects for this batch.");
      setSubjects(await res.json());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubjectsLoading(false);
    }
  }, [toast]);

  const fetchReport = useCallback(async () => {
    if (!selectedBatchId || !selectedSubjectId || !selectedLectureType) return;
    
    setIsReportLoading(true)
    setReportData([])
    
    const params = new URLSearchParams({ 
      batch_id: selectedBatchId,
      subject_id: selectedSubjectId,
      lecture_type: selectedLectureType
    });

    try {
      const res = await fetch(`/api/admin/attendance-report?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch attendance report")
      }
      setReportData(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsReportLoading(false)
    }
  }, [toast, selectedBatchId, selectedSubjectId, selectedLectureType]);
  
  useEffect(() => {
    if (selectedBatchId && selectedSubjectId && selectedLectureType) {
        fetchReport();
    }
  }, [selectedBatchId, selectedSubjectId, selectedLectureType, fetchReport]);


  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setSelectedSubjectId("")
    setSelectedLectureType("")
    setReportData([])
    fetchSubjectsForBatch(batchId);
  }
  
  const handleViewStudents = async () => {
    if (!selectedBatchId) return;
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch student details");
      }
      const data = await res.json();
      setSelectedBatchStudents(data.students || []);
      setIsViewStudentsModalOpen(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const showReport = selectedBatchId && selectedSubjectId && selectedLectureType;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Attendance Report</CardTitle>
              <CardDescription>View attendance percentages by batch and subject.</CardDescription>
            </div>
            <Button variant="outline" onClick={handleViewStudents} disabled={!selectedBatchId}>
              <Users className="mr-2 h-4 w-4" /> View Student Roster
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="batch">1. Select Batch</Label>
              <Select onValueChange={handleBatchChange} value={selectedBatchId} disabled={isLoading}>
                <SelectTrigger id="batch">
                  <SelectValue placeholder="Select a batch..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.dept_name} {b.class_number} ({b.academic_year} Sem {b.semester})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">2. Select Subject</Label>
              <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedBatchId || isSubjectsLoading}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="lecture_type">3. Select Lecture Type</Label>
                <Select onValueChange={setSelectedLectureType} value={selectedLectureType} disabled={!selectedSubjectId}>
                    <SelectTrigger id="lecture_type">
                    <SelectValue placeholder="Select a type..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TH">Theory</SelectItem>
                        <SelectItem value="PR">Practical</SelectItem>
                        <SelectItem value="TU">Tutorial</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {showReport ? (
              <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">Attended</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isReportLoading ? (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">Loading report...</TableCell>
                      </TableRow>
                  ) : reportData.length > 0 ? (
                      reportData.map((row) => (
                      <TableRow key={row.student_id}>
                        <TableCell className="font-medium">{row.roll_no}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-center">{row.attended_lectures}</TableCell>
                        <TableCell className="text-center">{row.total_lectures}</TableCell>
                        <TableCell className="text-right font-bold">{row.percentage}%</TableCell>
                      </TableRow>
                  ))
                  ) : (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">No attendance data found for the selected filters.</TableCell>
                      </TableRow>
                  )}
                  </TableBody>
              </Table>
              </div>
          ) : (
            <Alert>
                <FileBarChart className="h-4 w-4" />
                <AlertDescription>
                    Please select a batch, subject, and lecture type to view the attendance report.
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
       <Dialog open={isViewStudentsModalOpen} onOpenChange={setIsViewStudentsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Students in Batch</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Enrollment No</TableHead>
                        <TableHead>Batch No</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {selectedBatchStudents.map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{s.roll_no}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.enrollment_no}</TableCell>
                            <TableCell>{s.batch_number ?? 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
