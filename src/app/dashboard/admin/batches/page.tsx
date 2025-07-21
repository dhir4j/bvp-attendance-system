"use client"

import { useState, useEffect, useCallback } from "react"
import { PlusCircle, MoreHorizontal, Edit, Trash2, UserPlus, UserX, FileCheck2 } from "lucide-react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const initialFormData: Omit<Batch, 'id'> = {
    dept_code: "",
    class_name: "",
    academic_year: "",
    semester: "" as unknown as number,
};

export default function BatchesPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentsInBatch, setStudentsInBatch] = useState<Student[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/batches");
      if (!res.ok) throw new Error("Failed to fetch batches")
      setBatches(await res.json());
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
    setSelectedFile(null)
  }

  const handleOpenStudentModal = async (batch: Batch) => {
    setSelectedBatch(batch);
    setIsLoading(true);
    setIsStudentModalOpen(true);
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}`);
      if (!res.ok) throw new Error("Failed to fetch student details");
      const data = await res.json();
      setStudentsInBatch(data.students);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      handleCloseStudentModal();
    } finally {
      setIsLoading(false);
    }
  }

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false);
    setSelectedBatch(null);
    setStudentsInBatch([]);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSaveBatch = async () => {
    const url = "/api/admin/batches";
    const method = "POST";
    
    if (!formData.dept_code || !formData.class_name || !formData.academic_year || !formData.semester) {
        toast({variant: "destructive", title: "Error", description: "All batch details are required."})
        return
    }

    if (!selectedFile) {
      toast({variant: "destructive", title: "Error", description: "A student CSV file is required to create a batch."})
      return
    }

    setIsUploading(true);
    const postData = new FormData();
    postData.append('dept_code', formData.dept_code);
    postData.append('class_name', formData.class_name);
    postData.append('academic_year', formData.academic_year);
    postData.append('semester', String(formData.semester));
    if (selectedFile) {
        postData.append('file', selectedFile);
    }

    try {
      const res = await fetch(url, { method, body: postData });
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to add batch`)
      }
      toast({ title: "Success", description: `Batch created and students imported.` })
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsUploading(false);
    }
  }

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm("Are you sure you want to delete this batch? This will also unenroll all associated students.")) return;
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Batch & Student Management</CardTitle>
              <CardDescription>Create academic batches and enroll students via CSV upload.</CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Batch & Import Students
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
                          <DropdownMenuItem onClick={() => handleOpenStudentModal(b)}><UserPlus className="mr-2 h-4 w-4"/>View Students</DropdownMenuItem>
                          {/* <DropdownMenuItem onClick={() => handleOpenModal(b)}><Edit className="mr-2 h-4 w-4" />Edit Batch</DropdownMenuItem> */}
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
            <DialogTitle>Create New Batch & Import Students</DialogTitle>
            <DialogDescription>
              Enter batch details and upload a student CSV with columns: `batch`, `roll_no`, `enrollment_no`, `name`.
            </DialogDescription>
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
             <div className="space-y-2">
                <Label htmlFor="csv-file">Student CSV File</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
             </div>
             {selectedFile && (
                <Alert>
                  <FileCheck2 className="h-4 w-4" />
                  <AlertTitle>File Selected</AlertTitle>
                  <AlertDescription>
                    {selectedFile.name}
                  </AlertDescription>
                </Alert>
             )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSaveBatch} disabled={isUploading}>
              {isUploading ? "Processing..." : "Create and Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Students Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={handleCloseStudentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Students in {selectedBatch?.class_name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Enrollment No</TableHead>
                        <TableHead>Batch</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center">Loading students...</TableCell></TableRow>
                    ) : studentsInBatch.length > 0 ? studentsInBatch.map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{s.roll_no}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.enrollment_no}</TableCell>
                            <TableCell>{s.batch_number || 'N/A'}</TableCell>
                        </TableRow>
                    )) : (
                         <TableRow><TableCell colSpan={4} className="text-center">No students found in this batch.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={handleCloseStudentModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
