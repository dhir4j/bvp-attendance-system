// src/app/dashboard/admin/assignments/page.tsx
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
import type { Staff, Subject, Assignment, Batch } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

export default function AssignmentsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    staff_id: "",
    subject_id: "",
    batch_id: "",
    lecture_type: "",
    batch_number: null as number | null
  })

  const apiPrefix = useMemo(() => user?.role === 'hod' ? '/api/hod' : '/api/admin', [user?.role]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [assignmentsRes, staffRes, subjectsRes, batchesRes] = await Promise.all([
            fetch(`${apiPrefix}/assignments`),
            fetch(`${apiPrefix}/staff`),
            fetch(`${apiPrefix}/subjects`),
            fetch(`${apiPrefix}/batches`)
        ]);
        if(!assignmentsRes.ok || !staffRes.ok || !subjectsRes.ok || !batchesRes.ok) {
            throw new Error("Failed to fetch initial data");
        }
        setAssignments(await assignmentsRes.json());
        setStaff(await staffRes.json());
        setSubjects(await subjectsRes.json());
        setBatches(await batchesRes.json());
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast, apiPrefix]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if(!newAssignment.staff_id || !newAssignment.subject_id || !newAssignment.lecture_type || !newAssignment.batch_id) {
        toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." })
        return;
    }
    try {
        const res = await fetch(`${apiPrefix}/assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...newAssignment,
              staff_id: parseInt(newAssignment.staff_id),
              subject_id: parseInt(newAssignment.subject_id),
              batch_id: parseInt(newAssignment.batch_id),
            })
        });
        const errorData = await res.json();
        if (!res.ok) {
            throw new Error(errorData.error || "Failed to create assignment");
        }
        toast({ title: "Success", description: "Assignment created." });
        fetchData();
        setIsModalOpen(false);
        setNewAssignment({ staff_id: "", subject_id: "", lecture_type: "", batch_number: null, batch_id: "" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }
  
  const handleDelete = async (assignmentId: number) => {
    if(!confirm("Are you sure? This will delete associated attendance records.")) return;
    try {
        const res = await fetch(`${apiPrefix}/assignments/${assignmentId}`, { method: "DELETE" });
        if(!res.ok) {
             const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete assignment");
        }
        toast({ title: "Success", description: "Assignment deleted." });
        setAssignments(assignments.filter(a => a.id !== assignmentId));
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
              <CardDescription>Assign staff members to subjects, batches, and lecture types.</CardDescription>
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
                        <DialogDescription>Select a staff, subject, batch and lecture type.</DialogDescription>
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
                                    {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subject_name} ({s.subject_code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="batch">Batch</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, batch_id: value})}>
                                <SelectTrigger id="batch">
                                    <SelectValue placeholder="Select Batch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.dept_name} {b.class_number} ({b.academic_year} Sem {b.semester})</SelectItem>)}
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
                         {newAssignment.lecture_type && newAssignment.lecture_type !== 'TH' && (
                            <div className="space-y-2">
                                <Label htmlFor="batch_number">Sub-Batch Number (for PR/TU)</Label>
                                <Input id="batch_number" type="number" placeholder="e.g. 1, 2, 3" onChange={(e) => setNewAssignment({...newAssignment, batch_number: e.target.value ? parseInt(e.target.value) : null})} />
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
                    <TableHead>Batch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sub-Batch</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                    </TableRow>
                ) : assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.staff_name}</TableCell>
                      <TableCell>{a.subject_name}</TableCell>
                      <TableCell>{a.batch_name}</TableCell>
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
