"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, FileCheck2, FileX2 } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Student } from "@/types"

const initialFormData = {
    id: 0,
    roll_no: "",
    enrollment_no: "",
    name: "",
};

export default function StudentsPage() {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState(initialFormData)

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/students")
      if (!res.ok) throw new Error("Failed to fetch students")
      const data = await res.json()
      setStudents(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleOpenModal = (student: Student | null = null) => {
    setSelectedStudent(student)
    if (student) {
      setFormData(student);
    } else {
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedStudent(null)
  }

  const handleSave = async () => {
    const url = selectedStudent ? `/api/admin/students/${selectedStudent.id}` : "/api/admin/students";
    const method = selectedStudent ? "PUT" : "POST";
    
    if (!formData.roll_no || !formData.enrollment_no || !formData.name) {
        toast({variant: "destructive", title: "Error", description: "All fields are required."})
        return
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${selectedStudent ? 'update' : 'add'} student`)
      }
      toast({ title: "Success", description: `Student ${selectedStudent ? 'updated' : 'added'}.` })
      fetchStudents()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDelete = async (studentId: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
        const res = await fetch(`/api/admin/students/${studentId}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete student");
        }
        toast({ title: "Success", description: "Student deleted." });
        fetchStudents();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
        toast({ variant: "destructive", title: "No file selected", description: "Please select a CSV file to upload." });
        return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const res = await fetch("/api/admin/students/upload_csv", {
            method: "POST",
            body: formData,
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.error || "CSV upload failed");
        }
        
        toast({
            title: "Upload Successful",
            description: `${result.added} students added, ${result.updated} updated. ${result.errors?.length || 0} errors.`,
        });

        fetchStudents();
        setIsUploadModalOpen(false);
        setSelectedFile(null);

    } catch(error: any) {
        toast({ variant: "destructive", title: "Upload Error", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>View, add, edit, or delete students.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" /> Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Students via CSV</DialogTitle>
                    <DialogDescription>
                      Select a CSV file with columns: `roll_no`, `enrollment_no`, `name`. Existing students (matched by enrollment number) will be updated.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} />
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
                    <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
                      {isUploading ? 'Uploading...' : 'Upload and Process'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Enrollment Number</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : students.length > 0 ? students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.roll_no}</TableCell>
                    <TableCell>{s.enrollment_no}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(s)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No students found. Add one or import a CSV.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Edit Student Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {selectedStudent ? "Update the student's details." : "Enter the details for the new student."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll_no">Roll Number</Label>
              <Input id="roll_no" value={formData.roll_no} onChange={(e) => setFormData({...formData, roll_no: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollment_no">Enrollment Number</Label>
              <Input id="enrollment_no" value={formData.enrollment_no} onChange={(e) => setFormData({...formData, enrollment_no: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
