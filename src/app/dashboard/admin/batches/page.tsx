"use client"

import { useState, useEffect, useCallback } from "react"
import { PlusCircle, MoreHorizontal, Edit, Trash2, UserPlus, UserX } from "lucide-react"
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
import type { Batch, Student } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const initialFormData: Omit<Batch, 'id'> = {
    dept_code: "",
    class_name: "",
    academic_year: "",
    semester: "" as unknown as number,
};

export default function BatchesPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [formData, setFormData] = useState(initialFormData)

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesRes, studentsRes] = await Promise.all([
        fetch("/api/admin/batches"),
        fetch("/api/admin/students")
      ]);
      if (!batchesRes.ok || !studentsRes.ok) throw new Error("Failed to fetch data")
      setBatches(await batchesRes.json());
      setStudents(await studentsRes.json());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenModal = (batch: Batch | null = null) => {
    setSelectedBatch(batch)
    if (batch) {
      setFormData({
        dept_code: batch.dept_code,
        class_name: batch.class_name,
        academic_year: batch.academic_year,
        semester: batch.semester
      })
    } else {
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBatch(null)
  }

  const handleOpenStudentModal = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsStudentModalOpen(true);
  }

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false);
    setSelectedBatch(null);
    setSelectedStudentId("");
  }


  const handleSaveBatch = async () => {
    const url = selectedBatch ? `/api/admin/batches/${selectedBatch.id}` : "/api/admin/batches";
    const method = selectedBatch ? "PUT" : "POST";
    
    if (!formData.dept_code || !formData.class_name || !formData.academic_year || !formData.semester) {
        toast({variant: "destructive", title: "Error", description: "All fields are required."})
        return
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, semester: Number(formData.semester) }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${selectedBatch ? 'update' : 'add'} batch`)
      }
      toast({ title: "Success", description: `Batch ${selectedBatch ? 'updated' : 'added'}.` })
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;
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

  const handleAddStudentToBatch = async () => {
    if (!selectedBatch || !selectedStudentId) {
        toast({variant: "destructive", title: "Error", description: "Batch or student not selected."});
        return;
    }
    try {
        const res = await fetch(`/api/admin/batches/${selectedBatch.id}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: Number(selectedStudentId) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add student");

        toast({ title: "Success", description: "Student added to batch." });
        fetchData(); // Refresh all data
        const updatedBatchRes = await fetch(`/api/admin/batches/${selectedBatch.id}`);
        setSelectedBatch(await updatedBatchRes.json());
        setSelectedStudentId("");
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const handleRemoveStudentFromBatch = async (studentId: number) => {
    if (!selectedBatch) return;
     try {
        const res = await fetch(`/api/admin/batches/${selectedBatch.id}/students`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to remove student");

        toast({ title: "Success", description: "Student removed from batch." });
        fetchData();
        setSelectedBatch(prev => prev ? ({...prev, students: prev.students?.filter(s => s.id !== studentId)}) : null);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const availableStudents = students.filter(s => !selectedBatch?.students?.some(bs => bs.id === s.id));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Batch Management</CardTitle>
              <CardDescription>Create academic batches and manage student enrollments.</CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
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
                  <TableHead>Class Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Student Count</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                ) : batches.length > 0 ? batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.class_name}</TableCell>
                    <TableCell>{b.dept_code}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleOpenStudentModal(b)}><UserPlus className="mr-2 h-4 w-4"/>Manage Students</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal(b)}><Edit className="mr-2 h-4 w-4" />Edit Batch</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteBatch(b.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Batch</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No batches found. Create one to begin.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Batch Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBatch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class_name">Class Name</Label>
              <Input id="class_name" value={formData.class_name} onChange={(e) => setFormData({...formData, class_name: e.target.value})} placeholder="e.g. CO-1, AN-A"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_code">Department Code</Label>
              <Input id="dept_code" value={formData.dept_code} onChange={(e) => setFormData({...formData, dept_code: e.target.value})} placeholder="e.g. CO, AN"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input id="academic_year" value={formData.academic_year} onChange={(e) => setFormData({...formData, academic_year: e.target.value})} placeholder="e.g. 2024-2025"/>
            </div>
             <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" type="number" value={formData.semester} onChange={(e) => setFormData({...formData, semester: parseInt(e.target.value) || 0})} placeholder="e.g. 3"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSaveBatch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Students Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={handleCloseStudentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Students for {selectedBatch?.class_name}</DialogTitle>
            <DialogDescription>Add or remove students from this batch.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Add Student Section */}
              <div className="space-y-4">
                  <h3 className="font-semibold">Add Student</h3>
                  <div className="space-y-2">
                      <Label htmlFor="student-select">Available Students</Label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                          <SelectTrigger id="student-select">
                              <SelectValue placeholder="Select a student to add" />
                          </SelectTrigger>
                          <SelectContent>
                              <ScrollArea className="h-[200px]">
                                {availableStudents.length > 0 ? availableStudents.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name} ({s.roll_no})
                                    </SelectItem>
                                )) : <div className="p-4 text-sm text-muted-foreground">No students to add.</div>}
                              </ScrollArea>
                          </SelectContent>
                      </Select>
                  </div>
                  <Button onClick={handleAddStudentToBatch} disabled={!selectedStudentId} className="w-full">
                      <UserPlus className="mr-2 h-4 w-4" /> Add to Batch
                  </Button>
              </div>
              {/* Enrolled Students Section */}
              <div className="space-y-4">
                  <h3 className="font-semibold">Enrolled Students</h3>
                  <ScrollArea className="h-[250px] border rounded-md">
                      <div className="p-4">
                        {selectedBatch?.students && selectedBatch.students.length > 0 ? (
                             <ul className="space-y-2">
                                {selectedBatch.students.map(s => (
                                    <li key={s.id} className="flex items-center justify-between text-sm">
                                        <span>{s.name} <span className="text-muted-foreground">({s.roll_no})</span></span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveStudentFromBatch(s.id)}>
                                            <UserX className="h-4 w-4"/>
                                        </Button>
                                    </li>
                                ))}
                             </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center pt-10">No students in this batch.</p>
                        )}
                      </div>
                  </ScrollArea>
              </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={handleCloseStudentModal}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
