"use client"

import { useState } from "react"
import { BarChart, Filter, UserX } from "lucide-react"

import { subjectsWithAttendance } from "@/lib/data"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const DEFAULTER_THRESHOLD = 0.75

export default function DefaultersPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  
  const selectedSubject = selectedSubjectId ? subjectsWithAttendance.find(s => s.id === selectedSubjectId) : null;
  
  const defaulters = selectedSubject?.students.filter(student => (student.attended / selectedSubject.totalLectures) < DEFAULTER_THRESHOLD) || [];
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Defaulter List</h1>
        <p className="text-muted-foreground">
          View students with attendance below 75%.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filter by Subject</CardTitle>
          </div>
          <CardDescription>
            Select a subject to see the list of students with low attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a subject..." />
            </SelectTrigger>
            <SelectContent>
              {subjectsWithAttendance.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} - Section {subject.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSubject ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              <CardTitle>Results for {selectedSubject.name}</CardTitle>
            </div>
            <CardDescription>
              {defaulters.length > 0
                ? `${defaulters.length} student(s) found below the ${DEFAULTER_THRESHOLD * 100}% attendance threshold.`
                : "No defaulters found in this subject. Great job, everyone!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {defaulters.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Attended Lectures</TableHead>
                    <TableHead>Total Lectures</TableHead>
                    <TableHead className="text-right">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaulters.map((student) => {
                    const percentage = (
                      (student.attended / selectedSubject.totalLectures) * 100
                    ).toFixed(2)
                    return (
                      <TableRow key={student.rollNumber}>
                        <TableCell className="font-medium">{student.rollNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.attended}</TableCell>
                        <TableCell>{selectedSubject.totalLectures}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{percentage}%</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <BarChart className="mx-auto h-12 w-12 mb-4" />
                    <p>No defaulters found!</p>
                </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="flex items-center justify-center py-24">
            <div className="text-center text-muted-foreground">
                <BarChart className="mx-auto h-12 w-12 mb-4" />
                <p>Select a subject to view the defaulter list.</p>
            </div>
        </Card>
      )}
    </div>
  )
}
