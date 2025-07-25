// src/app/dashboard/admin/edit-attendance/page.tsx
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
import { Button } from "@/components/ui/button"
import type { Batch, Subject, EditableAttendanceRecord } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Pencil, Loader2, Save } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"

interface SubjectIdentifier {
  id: number;
  name: string;
}

export default function EditAttendancePage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [subjects, setSubjects] = useState<SubjectIdentifier[]>([])
  const [attendanceData, setAttendanceData] = useState<EditableAttendanceRecord[]>([])
  const [originalAttendanceData, setOriginalAttendanceData] = useState<EditableAttendanceRecord[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedLectureType, setSelectedLectureType] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [isLoading, setIsLoading] = useState(true)
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/batches')
      if (!res.ok) throw new Error("Failed to fetch batches")
      setBatches(await res.json())
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const fetchSubjectsForBatch = useCallback(async (batchId: string) => {
    if (!batchId) return;
    setIsSubjectsLoading(true)
    setSubjects([])
    setSelectedSubjectId("")
    try {
      const res = await fetch(`/api/admin/subjects/by-batch/${batchId}`)
      if (!res.ok) throw new Error("Failed to fetch subjects.")
      setSubjects(await res.json())
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSubjectsLoading(false)
    }
  }, [toast])

  const fetchAttendance = useCallback(async () => {
    if (!selectedBatchId || !selectedSubjectId || !selectedLectureType || !selectedDate) return
    
    setIsReportLoading(true)
    setAttendanceData([])
    
    const params = new URLSearchParams({ 
      batch_id: selectedBatchId,
      subject_id: selectedSubjectId,
      lecture_type: selectedLectureType,
      date: format(selectedDate, "yyyy-MM-dd")
    })

    try {
      const res = await fetch(`/api/admin/attendance/session?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch attendance data")
      setAttendanceData(data)
      setOriginalAttendanceData(JSON.parse(JSON.stringify(data)));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsReportLoading(false)
    }
  }, [toast, selectedBatchId, selectedSubjectId, selectedLectureType, selectedDate])
  
  useEffect(() => {
    if (selectedBatchId && selectedSubjectId && selectedLectureType && selectedDate) {
        fetchAttendance();
    }
  }, [fetchAttendance])


  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setSelectedSubjectId("")
    setSelectedLectureType("")
    setAttendanceData([])
    fetchSubjectsForBatch(batchId)
  }

  const handleStatusChange = (studentId: number, newStatus: boolean) => {
    setAttendanceData(prev => prev.map(record => 
        record.student_id === studentId ? { ...record, status: newStatus ? 'present' : 'absent' } : record
    ));
  }
  
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    const updates = attendanceData.map(record => ({
        student_id: record.student_id,
        status: record.status,
        assignment_id: record.assignment_id,
    }));
    
    try {
        const res = await fetch('/api/admin/attendance/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: format(selectedDate, "yyyy-MM-dd"),
                updates,
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save changes');
        
        toast({ title: 'Success', description: 'Attendance updated successfully.' });
        fetchAttendance(); // Re-fetch to confirm changes
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  const isChanged = JSON.stringify(attendanceData) !== JSON.stringify(originalAttendanceData);
  const showReport = selectedBatchId && selectedSubjectId && selectedLectureType;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Edit Attendance</CardTitle>
            <CardDescription>Manually modify attendance records for any session.</CardDescription>
          </div>
          <Button onClick={handleSaveChanges} disabled={!isChanged || isSaving} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="batch">Batch</Label>
            <Select onValueChange={handleBatchChange} value={selectedBatchId} disabled={isLoading}><SelectTrigger id="batch"><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.dept_name} {b.class_number}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedBatchId || isSubjectsLoading}><SelectTrigger id="subject"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lecture_type">Lecture Type</Label>
            <Select onValueChange={setSelectedLectureType} value={selectedLectureType} disabled={!selectedSubjectId}><SelectTrigger id="lecture_type"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="TH">Theory</SelectItem><SelectItem value="PR">Practical</SelectItem><SelectItem value="TU">Tutorial</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild><Button id="date" variant="outline" className="w-full justify-start text-left font-normal">{format(selectedDate, "PPP")}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(day) => day && setSelectedDate(day)} /></PopoverContent>
            </Popover>
          </div>
        </div>

        {showReport ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isReportLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">Loading attendance...</TableCell></TableRow>
                ) : attendanceData.length > 0 ? (
                  attendanceData.map((row) => (
                    <TableRow key={row.student_id}>
                      <TableCell className="font-medium">{row.roll_no}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Label htmlFor={`switch-${row.student_id}`} className={row.status === 'present' ? 'text-primary' : 'text-muted-foreground'}>
                            {row.status === 'present' ? 'Present' : 'Absent'}
                          </Label>
                          <Switch
                            id={`switch-${row.student_id}`}
                            checked={row.status === 'present'}
                            onCheckedChange={(checked) => handleStatusChange(row.student_id, checked)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">No attendance recorded for this session.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Alert>
            <Pencil className="h-4 w-4" />
            <AlertDescription>Please select all filters to view and edit attendance.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
