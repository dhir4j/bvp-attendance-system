// src/app/dashboard/defaulters/page.tsx
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
import type { StaffAssignmentsResponse, AttendanceReport } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserX } from "lucide-react"

export default function DefaultersPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<StaffAssignmentsResponse | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [reportData, setReportData] = useState<AttendanceReport[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  const fetchReport = useCallback(async (batchId: string) => {
    if (!batchId) return
    setIsReportLoading(true)
    setReportData([])
    try {
      const res = await fetch(`/api/staff/defaulters?batch_id=${batchId}`)
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
  }, [toast])

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    fetchReport(batchId)
  }

  const defaulters = reportData.filter(student => student.percentage < 75);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defaulter List</CardTitle>
        <CardDescription>View students with less than 75% attendance for a subject.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-sm mb-6">
          <Label htmlFor="batch">Select Subject/Batch</Label>
          <Select onValueChange={handleBatchChange} value={selectedBatchId} disabled={isLoading}>
            <SelectTrigger id="batch">
              <SelectValue placeholder="Select from your assignments..." />
            </SelectTrigger>
            <SelectContent>
              {assignments?.map((a) => (
                <SelectItem key={`${a.subject_id}-${a.batch_id}`} value={String(a.batch_id)}>
                   {a.subject_name} ({a.batch_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                        <TableCell colSpan={5} className="text-center h-24">No defaulters found for this subject, or no attendance data recorded yet.</TableCell>
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
                    Please select a subject to view the defaulter list.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  )
}
