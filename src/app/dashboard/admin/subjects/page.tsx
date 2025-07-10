"use client"

import { useState, useEffect, useCallback } from "react"
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react"
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
import type { Subject } from "@/types"

const initialFormData = {
    id: 0,
    course_code: "",
    dept_code: "",
    semester: "" as number | "",
    subject_code: "",
    subject_name: ""
};

type FormDataType = Omit<Subject, 'id' | 'semester'> & { id: number; semester: number | "" };


export default function SubjectsPage() {
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [formData, setFormData] = useState<FormDataType>(initialFormData)
  
  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
        const res = await fetch("/api/admin/subjects");
        if (!res.ok) throw new Error("Failed to fetch subjects");
        const data = await res.json();
        setSubjects(data);
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const handleOpenModal = (subject: Subject | null = null) => {
    setSelectedSubject(subject)
    if (subject) {
      setFormData({
        id: subject.id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        course_code: subject.course_code,
        dept_code: subject.dept_code,
        semester: subject.semester
      })
    } else {
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSubject(null)
  }

  const handleSave = async () => {
    if (!formData.semester || formData.semester < 1 || formData.semester > 8) {
      toast({ variant: "destructive", title: "Invalid Semester", description: "Semester must be a number between 1 and 8." });
      return;
    }

    const url = selectedSubject ? `/api/admin/subjects/${selectedSubject.id}` : "/api/admin/subjects";
    const method = selectedSubject ? "PUT" : "POST";

    const body:any = {
      subject_name: formData.subject_name,
      subject_code: formData.subject_code,
    }

    if (!selectedSubject) {
        body.course_code = formData.course_code;
        body.dept_code = formData.dept_code;
        body.semester_number = formData.semester;
    }
    
    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to ${selectedSubject ? 'update' : 'add'} subject`);
        }
        toast({ title: "Success", description: `Subject ${selectedSubject ? 'updated' : 'added'}.` });
        fetchSubjects();
        handleCloseModal();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }
  
  const handleDelete = async (subjectId: number) => {
    if(!confirm("Are you sure? This may also affect related assignments.")) return;
    try {
        const res = await fetch(`/api/admin/subjects/${subjectId}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete subject");
        }
        toast({ title: "Success", description: "Subject deleted." });
        fetchSubjects();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }
  
  const handleSemesterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
        setFormData({...formData, semester: ""});
        return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 6) {
        setFormData({...formData, semester: numValue});
    } else if (value.length > 1) {
      // do nothing to prevent invalid input
    } else {
      setFormData({...formData, semester: ""});
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Subject Management</CardTitle>
            <CardDescription>View, add, edit, or delete subjects.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Course Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.subject_name}</TableCell>
                  <TableCell>{s.subject_code}</TableCell>
                  <TableCell>{s.course_code}</TableCell>
                  <TableCell>{s.dept_code}</TableCell>
                  <TableCell>{s.semester}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSubject ? "Edit Subject" : "Add New Subject"}</DialogTitle>
            <DialogDescription>
               {selectedSubject ? "Update the details for this subject." : "Enter the details for the new subject."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name</Label>
              <Input id="name" value={formData.subject_name} onChange={(e) => setFormData({...formData, subject_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Subject Abr</Label>
              <Input id="code" value={formData.subject_code} onChange={(e) => setFormData({...formData, subject_code: e.target.value})} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="course_code">Course Code</Label>
              <Input id="course_code" value={formData.course_code} onChange={(e) => setFormData({...formData, course_code: e.target.value})} disabled={!!selectedSubject} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_code">Department Code</Label>
              <Input id="dept_code" value={formData.dept_code} onChange={(e) => setFormData({...formData, dept_code: e.target.value})} disabled={!!selectedSubject} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" type="number" value={formData.semester} onChange={handleSemesterChange} placeholder="1-6" disabled={!!selectedSubject} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
