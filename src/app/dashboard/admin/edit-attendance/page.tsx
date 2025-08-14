// src/app/dashboard/admin/edit-attendance/page.tsx
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
import type { Batch, Subject, EditableAttendanceRecord } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Pencil, Loader2, Save } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"

interface SubjectIdentifier {
  id: number;
  name: string;
}

export default function EditAttendancePage() {
  const { toast } = useToast()
  const { user } = useAuth()
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
  const [totalLectures, setTotalLectures] = useState(0);

  const apiPrefix = useMemo(() => user?.role === 'hod' ? '/api/hod' : '/api/admin', [user?.role]);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${apiPrefix}/batches`)
      if (!res.ok) throw new Error("Failed to fetch batches")
      setBatches(await res.json())
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast, apiPrefix])

  useEffect(() => {
    if (user) {
        fetchInitialData()
    }
  }, [fetchInitialData, user])

  const fetchSubjectsForBatch = useCallback(async (batchId: string) => {
    if (!batchId) return;
    setIsSubjectsLoading(true)
    setSubjects([])
    setSelectedSubjectId("")
    try {
      const res = await fetch(`${apiPrefix}/subjects-by-batch/${batchId}`)
      if (!res.ok) throw new Error("Failed to fetch subjects.")
      setSubjects(await res.json())
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSubjectsLoading(false)
    }
  }, [toast, apiPrefix])

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
      const res = await fetch(`${apiPrefix}/attendance/session?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch attendance data")
      
      const sessionData = data as EditableAttendanceRecord[];
      setAttendanceData(sessionData)
      setOriginalAttendanceData(JSON.parse(JSON.stringify(sessionData)));
      if (sessionData.length > 0) {
        setTotalLectures(sessionData[0].total_lectures);
      } else {
        setTotalLectures(0);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsReportLoading(false)
    }
  }, [toast, selectedBatchId, selectedSubjectId, selectedLectureType, selectedDate, apiPrefix])
  
  useEffect(() => {
    if (selectedBatchId && selectedSubjectId && selectedLectureType && selectedDate) {
        fetchAttendance();
    }
  }, [fetchAttendance, selectedBatchId, selectedSubjectId, selectedLectureType, selectedDate])


  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setSelectedSubjectId("")
    setSelectedLectureType("")
    setAttendanceData([])
    fetchSubjectsForBatch(batchId)
  }

  const handleLectureCountChange = (studentId: number, newCount: string) => {
    const count = parseInt(newCount, 10);
    if (isNaN(count) || count < 0) return; // Or show a toast

    setAttendanceData(prev => prev.map(record => 
        record.student_id === studentId ? { ...record, attended_lectures: count } : record
    ));
  }
  
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    const updates = attendanceData.map(record => ({
        student_id: record.student_id,
        attended_lectures: record.attended_lectures,
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
            {totalLectures > 0 && <p className="mb-4 text-sm text-muted-foreground">Total lectures held on this day: <strong>{totalLectures}</strong></p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right w-[150px]">Attended Lectures</TableHead>
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
                        <Input
                          type="number"
                          className="w-24 ml-auto text-right"
                          value={row.attended_lectures}
                          onChange={(e) => handleLectureCountChange(row.student_id, e.target.value)}
                          max={totalLectures}
                          min={0}
                        />
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
