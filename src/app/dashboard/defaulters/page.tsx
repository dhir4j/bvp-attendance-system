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
import type { StaffAssignmentsResponse, AttendanceReport } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserX } from "lucide-react"

interface SubjectIdentifier {
  id: number;
  name: string;
}

export default function DefaultersPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<StaffAssignmentsResponse | null>(null)
  const [subjects, setSubjects] = useState<SubjectIdentifier[]>([])

  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all")
  const [selectedLectureType, setSelectedLectureType] = useState<string>("all")
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
    setSelectedSubjectId("all");
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
    if (!selectedBatchId) return
    
    setIsReportLoading(true)
    setReportData([])
    
    const params = new URLSearchParams({ batch_id: selectedBatchId });
    if (selectedSubjectId && selectedSubjectId !== "all") {
      params.append('subject_id', selectedSubjectId);
    }
    if (selectedLectureType && selectedLectureType !== "all") {
      params.append('lecture_type', selectedLectureType);
    }

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
    if (selectedBatchId) {
        fetchReport();
    }
  }, [selectedBatchId, selectedSubjectId, selectedLectureType, fetchReport]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setSelectedSubjectId("all")
    setSelectedLectureType("all")
    setReportData([])
    fetchSubjectsForBatch(batchId);
  }

  const defaulters = reportData.filter(student => student.percentage < 75);
  const uniqueBatches = assignments ? [...new Map(assignments.map(item => [item['batch_id'], item])).values()] : [];
  
  const assignedLectureTypes = useMemo(() => {
    if (!selectedBatchId || selectedSubjectId === 'all' || !assignments) return [];
    
    const relevantAssignment = assignments.find(a => 
      String(a.batch_id) === selectedBatchId && String(a.subject_id) === selectedSubjectId
    );
    
    return relevantAssignment ? Object.keys(relevantAssignment.lecture_types) : [];
  }, [selectedBatchId, selectedSubjectId, assignments]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Defaulter List</CardTitle>
        <CardDescription>View students with less than 75% attendance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div className="space-y-2">
              <Label htmlFor="batch">Select Batch</Label>
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
              <Label htmlFor="subject">Select Subject</Label>
              <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedBatchId || isSubjectsLoading}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="All Assigned Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lecture_type">Lecture Type</Label>
              <Select onValueChange={setSelectedLectureType} value={selectedLectureType} disabled={!selectedSubjectId || selectedSubjectId === 'all'}>
                <SelectTrigger id="lecture_type">
                  <SelectValue placeholder="All Lecture Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {assignedLectureTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'TH' ? 'Theory' : type === 'PR' ? 'Practical' : 'Tutorial'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>

        {selectedBatchId && (
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
        )}

        {!selectedBatchId && !isLoading && (
            <Alert>
                <UserX className="h-4 w-4" />
                <AlertDescription>
                    Please select a batch to view the defaulter list.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  )
}
