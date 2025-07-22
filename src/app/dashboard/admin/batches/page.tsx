// src/app/dashboard/admin/batches/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PlusCircle, MoreHorizontal, Eye, Trash2 } from "lucide-react"
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

export default function BatchesPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false)
  const [selectedBatchStudents, setSelectedBatchStudents] = useState<Student[]>([]);
  
  const [formData, setFormData] = useState({
    dept_name: "",
    class_number: "",
    academic_year: "",
    semester: ""
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesRes, deptsRes] = await Promise.all([
        fetch("/api/admin/batches"),
        fetch("/api/admin/departments"),
      ]);
      if (!batchesRes.ok || !deptsRes.ok) throw new Error("Failed to fetch initial data");
      setBatches(await batchesRes.json());
      setDepartments(await deptsRes.json());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenModal = () => {
    setFormData({ dept_name: "", class_number: "", academic_year: "", semester: "" })
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSave = async () => {
    const { dept_name, class_number, academic_year, semester } = formData;
    const file = fileInputRef.current?.files?.[0];
    
    if(!dept_name || !class_number || !academic_year || !semester || !file) {
        toast({ variant: "destructive", title: "Validation Error", description: "All fields and the student CSV are required."})
        return;
    }

    const newFormData = new FormData();
    newFormData.append('dept_name', dept_name);
    newFormData.append('class_number', class_number);
    newFormData.append('academic_year', academic_year);
    newFormData.append('semester', semester);
    newFormData.append('student_csv', file);

    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        body: newFormData,
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to add batch`)
      }
      toast({ title: "Success", description: `Batch created.` })
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDelete = async (batchId: number) => {
    if (!confirm("Are you sure you want to delete this batch and all its students?")) return;
    try {
        const res = await fetch(`/api/admin/batches/${batchId}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete batch");
        }
        toast({ title: "Success", description: "Batch deleted." });
        fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const handleViewStudents = async (batchId: number) => {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch student details");
      }
      const data: Batch = await res.json();
      setSelectedBatchStudents(data.students || []);
      setIsViewStudentsModalOpen(true);
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
              <CardDescription>Create batches and upload student lists.</CardDescription>
            </div>
            <Button onClick={handleOpenModal} className="w-full sm:w-auto">
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
                  <TableRow>
                      <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.dept_name}</TableCell>
                    <TableCell>{b.class_number}</TableCell>
                    <TableCell>{b.academic_year}</TableCell>
                    <TableCell>{b.semester}</TableCell>
                    <TableCell>{b.student_count}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewStudents(b.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View Students
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(b.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
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

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>
              Enter the details for the new batch and upload the student CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Department</Label>
               <Select value={formData.dept_name} onValueChange={(value) => setFormData({...formData, dept_name: value})}>
                    <SelectTrigger id="dept_name">
                        <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map(d => <SelectItem key={d.dept_code} value={d.dept_name}>{d.dept_name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_number">Class Number</Label>
              <Input id="class_number" placeholder="e.g. A, B, 1, 2" value={formData.class_number} onChange={(e) => setFormData({...formData, class_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input id="academic_year" placeholder="e.g. 2023-2024" value={formData.academic_year} onChange={(e) => setFormData({...formData, academic_year: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" type="number" placeholder="e.g. 3" value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value})} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="student_csv">Student CSV File</Label>
              <Input id="student_csv" type="file" accept=".csv" ref={fileInputRef} />
              <p className="text-xs text-muted-foreground">CSV must have columns: roll_no, enrollment_no, name, batch_number</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isViewStudentsModalOpen} onOpenChange={setIsViewStudentsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Students in Batch</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Enrollment No</TableHead>
                        <TableHead>Batch No</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {selectedBatchStudents.map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{s.roll_no}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.enrollment_no}</TableCell>
                            <TableCell>{s.batch_number ?? 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
