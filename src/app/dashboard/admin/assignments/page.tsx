"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { PlusCircle, Trash2 } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { Staff, Subject, Assignment, Classroom } from "@/types"
import { useToast } from "@/hooks/use-toast"

const initialNewAssignment = {
    staff_id: "",
    subject_id: "",
    lecture_type: "",
    batch_number: null as number | null,
    classroom_id: "",
};

export default function AssignmentsPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState(initialNewAssignment);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [assignmentsRes, staffRes, subjectsRes, classroomsRes] = await Promise.all([
            fetch('/api/admin/assignments'),
            fetch('/api/admin/staff'),
            fetch('/api/admin/subjects'),
            fetch('/api/admin/classrooms')
        ]);
        if(!assignmentsRes.ok || !staffRes.ok || !subjectsRes.ok || !classroomsRes.ok) {
            throw new Error("Failed to fetch initial data. Make sure all dependencies like Classrooms are created.");
        }
        setAssignments(await assignmentsRes.json());
        setStaff(await staffRes.json());
        setSubjects(await subjectsRes.json());
        setClassrooms(await classroomsRes.json());
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignedData = useMemo(() => {
    return assignments.map(a => {
        const staffMember = staff.find(s => s.id === a.staff_id)
        const subject = subjects.find(s => s.id === a.subject_id)
        const classroom = classrooms.find(c => c.id === a.classroom_id)
        return { 
            ...a, 
            staffName: staffMember?.full_name || 'Unknown Staff', 
            subjectName: subject ? `${subject.subject_name} (${subject.subject_code})` : 'Unknown Subject',
            classroomName: classroom?.class_name || 'Unknown Classroom'
        }
    });
  }, [assignments, staff, subjects, classrooms]);

  const handleSave = async () => {
    if(!newAssignment.staff_id || !newAssignment.subject_id || !newAssignment.lecture_type || !newAssignment.classroom_id) {
        toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." })
        return
    }

    try {
        const res = await fetch("/api/admin/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...newAssignment,
              staff_id: parseInt(newAssignment.staff_id),
              subject_id: parseInt(newAssignment.subject_id),
              classroom_id: parseInt(newAssignment.classroom_id)
            })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create assignment");
        }
        toast({ title: "Success", description: "Assignment created." });
        fetchData();
        setIsModalOpen(false);
        setNewAssignment(initialNewAssignment);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }
  
  const handleDelete = async (assignmentId: number) => {
    if(!confirm("Are you sure?")) return;
    try {
        const res = await fetch(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
        if(!res.ok) {
             const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete assignment");
        }
        toast({ title: "Success", description: "Assignment deleted." });
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
              <CardTitle>Staff-Subject Assignments</CardTitle>
              <CardDescription>Assign staff members to subjects, lectures, and classrooms.</CardDescription>
            </div>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Assignment
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Assignment</DialogTitle>
                        <DialogDescription>Select a staff, subject, type, and classroom to assign.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff">Staff</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, staff_id: value})}>
                                <SelectTrigger id="staff">
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, subject_id: value})}>
                                <SelectTrigger id="subject">
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subject_name} - {s.subject_code}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="classroom">Classroom</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, classroom_id: value})}>
                                <SelectTrigger id="classroom">
                                    <SelectValue placeholder="Select Classroom" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classrooms.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.class_name} ({c.dept_code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lecture_type">Lecture Type</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, lecture_type: value})}>
                                <SelectTrigger id="lecture_type">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TH">Theory (TH)</SelectItem>
                                    <SelectItem value="PR">Practical (PR)</SelectItem>
                                    <SelectItem value="TU">Tutorial (TU)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         {newAssignment.lecture_type !== 'TH' && (
                            <div className="space-y-2">
                                <Label htmlFor="batch_number">Batch Number</Label>
                                <Input id="batch_number" type="number" placeholder="Enter batch number (e.g. 1, 2, 3)" onChange={(e) => setNewAssignment({...newAssignment, batch_number: e.target.value ? parseInt(e.target.value) : null})} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Assignment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Assigned Subject</TableHead>
                    <TableHead>Classroom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                    </TableRow>
                ) : assignedData.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">No assignments found.</TableCell>
                    </TableRow>
                ) : assignedData.map((a) => (
                    <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.staffName}</TableCell>
                    <TableCell>{a.subjectName}</TableCell>
                    <TableCell>{a.classroomName}</TableCell>
                    <TableCell>{a.lecture_type}</TableCell>
                    <TableCell>{a.batch_number ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
