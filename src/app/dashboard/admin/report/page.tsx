// src/app/dashboard/admin/report/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
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
import type { Batch, AttendanceReport, Subject } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileBarChart } from "lucide-react"

interface SubjectIdentifier {
  id: number;
  name: string;
}

export default function ReportPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [subjects, setSubjects] = useState<SubjectIdentifier[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all")
  const [reportData, setReportData] = useState<AttendanceReport[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)

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
    setSelectedSubjectId("all");
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
    if (!selectedBatchId) return;
    
    setIsReportLoading(true)
    setReportData([])
    
    const params = new URLSearchParams({ batch_id: selectedBatchId });
    if (selectedSubjectId && selectedSubjectId !== "all") {
      params.append('subject_id', selectedSubjectId);
    }

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
  }, [toast, selectedBatchId, selectedSubjectId]);

  useEffect(() => {
    // Fetch report whenever batch or subject changes
    if (selectedBatchId) {
        fetchReport();
    }
  }, [selectedBatchId, selectedSubjectId, fetchReport]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setSelectedSubjectId("all")
    setReportData([])
    fetchSubjectsForBatch(batchId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Report</CardTitle>
        <CardDescription>View attendance percentages by batch and subject.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="batch">Select Batch</Label>
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
            <Label htmlFor="subject">Select Subject (Optional)</Label>
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedBatchId || isSubjectsLoading}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="All Subjects" />
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
        )}

        {!selectedBatchId && !isLoading && (
            <Alert>
                <FileBarChart className="h-4 w-4" />
                <AlertDescription>
                    Please select a batch to view its attendance report.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  )
}
