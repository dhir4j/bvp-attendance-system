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
import type { Classroom, AttendanceReport } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileBarChart } from "lucide-react"

export default function ReportPage() {
  const { toast } = useToast()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("")
  const [reportData, setReportData] = useState<AttendanceReport[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)

  const fetchClassrooms = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/classrooms')
      if (!res.ok) throw new Error("Failed to fetch classrooms")
      const data = await res.json()
      setClassrooms(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  const fetchReport = useCallback(async (classroomId: string) => {
    if (!classroomId) return
    setIsReportLoading(true)
    setReportData([])
    try {
      const res = await fetch(`/api/admin/attendance-report?classroom_id=${classroomId}`)
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

  const handleClassroomChange = (classroomId: string) => {
    setSelectedClassroomId(classroomId)
    fetchReport(classroomId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Report</CardTitle>
        <CardDescription>View classroom-wise attendance percentages for all students.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-sm mb-6">
          <Label htmlFor="classroom">Select Classroom</Label>
          <Select onValueChange={handleClassroomChange} value={selectedClassroomId} disabled={isLoading}>
            <SelectTrigger id="classroom">
              <SelectValue placeholder="Select a classroom..." />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.class_name} ({c.batch_info})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClassroomId && (
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
                        <TableCell colSpan={5} className="text-center h-24">No attendance data found for this classroom.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        )}

        {!selectedClassroomId && !isLoading && (
            <Alert>
                <FileBarChart className="h-4 w-4" />
                <AlertDescription>
                    Please select a classroom to view its attendance report.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  )
}
