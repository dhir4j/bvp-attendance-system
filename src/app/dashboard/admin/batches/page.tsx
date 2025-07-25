// src/app/dashboard/admin/batches/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PlusCircle, MoreHorizontal, Eye, Trash2, Edit } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Batch, Department, Student } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StudentFormData = Omit<Student, 'id'>

export default function BatchesPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modals State
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false)
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)

  // Data State
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [selectedBatchStudents, setSelectedBatchStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // Forms State
  const [createBatchFormData, setCreateBatchFormData] = useState({
    dept_name: "",
    class_number: "",
    academic_year: "",
    semester: ""
  })
  const [studentFormData, setStudentFormData] = useState<StudentFormData>({
      name: "", roll_no: "", enrollment_no: "", batch_number: null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [batchesRes, deptsRes] = await Promise.all([
        fetch("/api/admin/batches"),
        fetch("/api/admin/departments"),
      ])
      if (!batchesRes.ok || !deptsRes.ok) throw new Error("Failed to fetch initial data")
      setBatches(await batchesRes.json())
      setDepartments(await deptsRes.json())
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateBatch = async () => {
    const { dept_name, class_number, academic_year, semester } = createBatchFormData
    const file = fileInputRef.current?.files?.[0]
    
    if(!dept_name || !class_number || !academic_year || !semester) {
        toast({ variant: "destructive", title: "Validation Error", description: "All batch details are required."})
        return
    }

    const newFormData = new FormData()
    newFormData.append('dept_name', dept_name)
    newFormData.append('class_number', class_number)
    newFormData.append('academic_year', academic_year)
    newFormData.append('semester', semester)
    if (file) newFormData.append('student_csv', file)

    try {
      const res = await fetch("/api/admin/batches", { method: "POST", body: newFormData })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create batch')
      toast({ title: "Success", description: "Batch created." })
      fetchData()
      setIsCreateBatchModalOpen(false)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm("Are you sure? This will delete the batch and all related assignments and attendance records.")) return
    try {
        const res = await fetch(`/api/admin/batches/${batchId}`, { method: "DELETE" })
        if(!res.ok) throw new Error((await res.json()).error || "Failed to delete batch")
        toast({ title: "Success", description: "Batch deleted." })
        fetchData()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleViewStudents = async (batch: Batch) => {
    setSelectedBatch(batch)
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}`)
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch students")
      const data = await res.json()
      setSelectedBatchStudents(data.students || [])
      setIsViewStudentsModalOpen(true)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleOpenStudentModal = (student: Student | null) => {
    setSelectedStudent(student);
    setStudentFormData(student ? { ...student } : { name: "", roll_no: "", enrollment_no: "", batch_number: null });
    setIsStudentModalOpen(true);
  };
  
  const handleSaveStudent = async () => {
    if (!selectedBatch) return;

    const url = selectedStudent 
      ? `/api/admin/students/${selectedStudent.id}` 
      : `/api/admin/batches/${selectedBatch.id}/students`;
    const method = selectedStudent ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentFormData),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save student');

      toast({ title: "Success", description: `Student ${selectedStudent ? 'updated' : 'added'}.` });
      // Refresh student list for the current batch
      handleViewStudents(selectedBatch);
      setIsStudentModalOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleRemoveStudentFromBatch = async (studentId: number) => {
    if (!selectedBatch || !confirm("Are you sure you want to remove this student from the batch? This will not delete their attendance records.")) return;
    try {
        const res = await fetch(`/api/admin/batches/${selectedBatch.id}/students/${studentId}`, { method: 'DELETE'});
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove student');

        toast({ title: "Success", description: "Student removed from batch." });
        handleViewStudents(selectedBatch); // Refresh list
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Batch Management</CardTitle>
              <CardDescription>Create batches and manage student lists.</CardDescription>
            </div>
            <Button onClick={() => setIsCreateBatchModalOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Batch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Student Count</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                ) : batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.dept_name}</TableCell>
                    <TableCell>{b.class_number}</TableCell>
                    <TableCell>{b.academic_year}</TableCell>
                    <TableCell>{b.semester}</TableCell>
                    <TableCell>{b.student_count}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewStudents(b)}><Eye className="mr-2 h-4 w-4" /> View/Edit Students</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteBatch(b.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Batch</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Batch Modal */}
      <Dialog open={isCreateBatchModalOpen} onOpenChange={setIsCreateBatchModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Enter batch details and optionally upload a student CSV.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Department</Label>
               <Select value={createBatchFormData.dept_name} onValueChange={(value) => setCreateBatchFormData({...createBatchFormData, dept_name: value})}>
                    <SelectTrigger id="dept_name"><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.dept_code} value={d.dept_name}>{d.dept_name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_number">Class Number</Label>
              <Input id="class_number" placeholder="e.g. A, B, 1, 2" value={createBatchFormData.class_number} onChange={(e) => setCreateBatchFormData({...createBatchFormData, class_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input id="academic_year" placeholder="e.g. 2023-2024" value={createBatchFormData.academic_year} onChange={(e) => setCreateBatchFormData({...createBatchFormData, academic_year: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" type="number" placeholder="e.g. 3" value={createBatchFormData.semester} onChange={(e) => setCreateBatchFormData({...createBatchFormData, semester: e.target.value})} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="student_csv">Student CSV File (Optional)</Label>
              <Input id="student_csv" type="file" accept=".csv" ref={fileInputRef} />
              <p className="text-xs text-muted-foreground">Columns: roll_no, enrollment_no, name, batch_number (optional)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateBatchModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBatch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Students Modal */}
      <Dialog open={isViewStudentsModalOpen} onOpenChange={setIsViewStudentsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
                <div>
                    <DialogTitle>Students in {selectedBatch?.dept_name} {selectedBatch?.class_number}</DialogTitle>
                    <DialogDescription>Add, edit, or remove students from this batch.</DialogDescription>
                </div>
                <Button onClick={() => handleOpenStudentModal(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Student</Button>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Enrollment No</TableHead>
                        <TableHead>Sub-Batch</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {selectedBatchStudents.map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{s.roll_no}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.enrollment_no}</TableCell>
                            <TableCell>{s.batch_number ?? 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenStudentModal(s)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveStudentFromBatch(s.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Student Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student_name">Name</Label>
              <Input id="student_name" value={studentFormData.name} onChange={e => setStudentFormData({...studentFormData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_roll">Roll Number</Label>
              <Input id="student_roll" value={studentFormData.roll_no} onChange={e => setStudentFormData({...studentFormData, roll_no: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_enrollment">Enrollment Number</Label>
              <Input id="student_enrollment" value={studentFormData.enrollment_no} onChange={e => setStudentFormData({...studentFormData, enrollment_no: e.target.value})} disabled={!!selectedStudent} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_batch_number">Sub-Batch (Optional)</Label>
              <Input id="student_batch_number" type="number" value={studentFormData.batch_number ?? ''} onChange={e => setStudentFormData({...studentFormData, batch_number: e.target.value ? parseInt(e.target.value) : null})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStudent}>Save Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
