"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, CheckCircle, Plus, Users, X } from "lucide-react"
import { format } from "date-fns"

import type { Subject } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AttendanceSheetProps {
  subject: Subject
}

export function AttendanceSheet({ subject }: AttendanceSheetProps) {
  const router = useRouter()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [lecture, setLecture] = useState<string>("1")
  const [absentRollNumber, setAbsentRollNumber] = useState("")
  const [absentStudents, setAbsentStudents] = useState<Set<string>>(new Set())
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const toggleAttendance = (rollNumber: string) => {
    setAbsentStudents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rollNumber)) {
        newSet.delete(rollNumber)
      } else {
        newSet.add(rollNumber)
      }
      return newSet
    })
  }
  
  const handleAddAbsentee = () => {
    if (absentRollNumber.trim() !== "") {
        const studentExists = subject.students.some(s => s.rollNumber.toLowerCase() === absentRollNumber.trim().toLowerCase());
        if(studentExists) {
            setAbsentStudents(prev => new Set(prev).add(absentRollNumber.trim().toUpperCase()));
        }
        setAbsentRollNumber("");
    }
  }

  const handleSubmit = () => {
    // In a real app, you'd send this data to a server
    console.log({
      subjectId: subject.id,
      date,
      lecture,
      absentees: Array.from(absentStudents),
    })
    setShowSuccessDialog(true)
  }

  const handleDialogClose = () => {
    setShowSuccessDialog(false);
    router.push('/dashboard');
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">{subject.name}</h1>
          <p className="text-muted-foreground">Mark attendance for Section {subject.section}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Select lecture number and date for this attendance session.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Lecture Number</Label>
              <Select value={lecture} onValueChange={setLecture}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lecture" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(8)].map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Lecture {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mark Absentees</CardTitle>
            <CardDescription>Quickly add absent students by roll number or toggle their status in the list below.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex gap-2 mb-4">
                <Input
                    placeholder="Enter Roll No. (e.g., 2K22/A/01)"
                    value={absentRollNumber}
                    onChange={(e) => setAbsentRollNumber(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAbsentee()}
                />
                <Button onClick={handleAddAbsentee} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
             </div>
            <Card className="h-[450px]">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subject.students.map((student) => (
                      <TableRow key={student.rollNumber} className={cn(absentStudents.has(student.rollNumber) && "bg-destructive/10")}>
                        <TableCell className="font-medium">{student.rollNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={!absentStudents.has(student.rollNumber)}
                            onCheckedChange={() => toggleAttendance(student.rollNumber)}
                            aria-label={`Mark ${student.name} as present or absent`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 left-0 right-0 mt-6 bg-card/80 backdrop-blur-sm border-t p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground" />
            <span className="font-medium">{absentStudents.size}</span>
            <span className="text-muted-foreground">student(s) marked absent</span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Submit Attendance
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
                Attendance for {subject.name} on {date ? format(date, "PPP") : ""} has been successfully saved.
            </p>
            <Button onClick={handleDialogClose} className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Done
            </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
