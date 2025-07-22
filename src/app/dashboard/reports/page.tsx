// src/app/dashboard/reports/page.tsx
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
import type { StaffAssignmentsResponse, AttendanceReport, Student } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileBarChart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export default function StaffReportsPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<StaffAssignmentsResponse | null>(null)
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

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/assignments');
      if (!res.ok) throw new Error("Failed to fetch your assigned subjects.");
      const data = await res.json();
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
  
  const fetchSubjectsForBatch = useCallback(async (batchId: string) => {
    if (!batchId) return;
    setIsSubjectsLoading(true);
    setSubjects([]);
    setSelectedSubjectId("");
    try {
      const res = await fetch(`/api/staff/subjects/by-batch/${batchId}`);
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

    setIsReportLoading(true);
    setReportData([]);
    
    const params = new URLSearchParams({ 
        batch_id: selectedBatchId,
        subject_id: selectedSubjectId,
        lecture_type: selectedLectureType
    });

    try {
      const res = await fetch(`/api/staff/reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch attendance report");
      setReportData(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsReportLoading(false);
    }
  }, [selectedBatchId, selectedSubjectId, selectedLectureType, toast]);

  useEffect(() => {
     if (selectedBatchId && selectedSubjectId && selectedLectureType) {
        fetchReport();
    }
  }, [fetchReport, selectedBatchId, selectedSubjectId, selectedLectureType]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedSubjectId("");
    setSelectedLectureType("");
    setReportData([]);
    fetchSubjectsForBatch(batchId);
  };
  
  const uniqueBatches = assignments ? [...new Map(assignments.map(item => [item['batch_id'], item])).values()] : [];
  
  const assignedLectureTypes = useMemo(() => {
    if (!selectedBatchId || !selectedSubjectId || !assignments) return [];
    
    const relevantAssignment = assignments.find(a => 
      String(a.batch_id) === selectedBatchId && String(a.subject_id) === selectedSubjectId
    );
    
    return relevantAssignment ? Object.keys(relevantAssignment.lecture_types) : [];
  }, [selectedBatchId, selectedSubjectId, assignments]);
  
  const showReport = selectedBatchId && selectedSubjectId && selectedLectureType;
  
  const handleViewStudents = async () => {
    if (!selectedBatchId) return;

    // Find the specific sub-batch number if a PR/TU is selected
    let subBatchNumber: number | null = null;
    if (selectedLectureType && selectedLectureType !== 'TH' && assignments) {
      const relevantAssignment = assignments.find(a => 
        String(a.batch_id) === selectedBatchId && String(a.subject_id) === selectedSubjectId
      );
      if (relevantAssignment?.lecture_types[selectedLectureType]) {
        // This logic assumes one staff teaches one sub-batch per PR/TU.
        // If a staff could teach multiple, this would need adjustment.
        subBatchNumber = relevantAssignment.lecture_types[selectedLectureType][0] ?? null;
      }
    }

    const params = new URLSearchParams();
    if (selectedLectureType) params.append('lecture_type', selectedLectureType);
    if (subBatchNumber) params.append('batch_number', String(subBatchNumber));

    try {
      const res = await fetch(`/api/staff/roster/${selectedBatchId}?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch student details");
      }
      const data = await res.json();
      setSelectedBatchStudents(data || []);
      setIsViewStudentsModalOpen(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Attendance Report</CardTitle>
              <CardDescription>View detailed attendance for your assigned subjects.</CardDescription>
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
                  <SelectValue placeholder="Select from your assignments..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueBatches.map((a) => (
                    <SelectItem key={a.batch_id} value={String(a.batch_id)}>
                      {a.batch_name}
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
                   {assignedLectureTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'TH' ? 'Theory' : type === 'PR' ? 'Practical' : 'Tutorial'}
                    </SelectItem>
                  ))}
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
                      <TableRow key={row.student_id} className={row.percentage < 75 ? "bg-destructive/10" : ""}>
                        <TableCell className="font-medium">{row.roll_no}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-center">{row.attended_lectures}</TableCell>
                        <TableCell className="text-center">{row.total_lectures}</TableCell>
                        <TableCell className={`text-right font-bold ${row.percentage < 75 ? "text-destructive" : ""}`}>{row.percentage}%</TableCell>
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
