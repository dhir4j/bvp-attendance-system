// src/app/dashboard/defaulters/page.tsx
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
import type { StaffAssignmentsResponse, AttendanceReport } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserX, FileDown } from "lucide-react"

interface SubjectIdentifier {
  id: number;
  name: string;
}

export default function DefaultersPage() {
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

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/staff/assignments')
      if (!res.ok) throw new Error("Failed to fetch your assigned subjects.")
      const data = await res.json()
      setAssignments(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])
  
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
    if (!selectedBatchId || !selectedSubjectId || !selectedLectureType) return
    
    setIsReportLoading(true)
    setReportData([])
    
    const params = new URLSearchParams({ 
      batch_id: selectedBatchId,
      subject_id: selectedSubjectId,
      lecture_type: selectedLectureType
    });

    try {
      const res = await fetch(`/api/staff/defaulters?${params.toString()}`)
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

  const defaulters = reportData.filter(student => student.percentage < 75);
  const uniqueBatches = assignments ? [...new Map(assignments.map(item => [item['batch_id'], item])).values()] : [];
  
  const assignedLectureTypes = useMemo(() => {
    if (!selectedBatchId || !selectedSubjectId || !assignments) return [];
    
    const relevantAssignment = assignments.find(a => 
      String(a.batch_id) === selectedBatchId && String(a.subject_id) === selectedSubjectId
    );
    
    return relevantAssignment ? Object.keys(relevantAssignment.lecture_types) : [];
  }, [selectedBatchId, selectedSubjectId, assignments]);

  const showReport = selectedBatchId && selectedSubjectId && selectedLectureType;

  const handleExportCSV = () => {
    if (defaulters.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No defaulters to export." });
      return;
    }

    const headers = "Roll No,Student Name,Attended Lectures,Total Lectures,Percentage\n";
    const csvContent = defaulters.map(row => 
      `${row.roll_no},"${row.name}",${row.attended_lectures},${row.total_lectures},${row.percentage}`
    ).join("\n");

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `defaulter-list-${selectedBatchId}-${selectedSubjectId}-${selectedLectureType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Defaulter List</CardTitle>
            <CardDescription>View students with less than 75% attendance.</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExportCSV} disabled={!showReport || defaulters.length === 0}>
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
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
                ) : defaulters.length > 0 ? (
                    defaulters.map((row) => (
                    <TableRow key={row.student_id} className="bg-destructive/10">
                      <TableCell className="font-medium">{row.roll_no}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-center">{row.attended_lectures}</TableCell>
                      <TableCell className="text-center">{row.total_lectures}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">{row.percentage}%</TableCell>
                    </TableRow>
                ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No defaulters found for this selection, or no attendance data recorded yet.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        ) : (
            <Alert>
                <UserX className="h-4 w-4" />
                <AlertDescription>
                    Please select a batch, subject, and lecture type to view the defaulter list.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  )
}
