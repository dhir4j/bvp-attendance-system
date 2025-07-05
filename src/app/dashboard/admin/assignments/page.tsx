"use client"

import { useState, useMemo } from "react"
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
import { 
    staff as allStaff,
    subjects as allSubjects,
    assignments as initialAssignments
} from "@/lib/data"
import type { StaffSubjectAssignment } from "@/types"
import { useToast } from "@/hooks/use-toast"

export default function AssignmentsPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<StaffSubjectAssignment[]>(initialAssignments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState<{ staffId: string; subjectId: string }>({ staffId: "", subjectId: "" })

  const assignedData = useMemo(() => {
    return assignments.map(a => {
        const staff = allStaff.find(s => s.id === a.staffId)
        const subject = allSubjects.find(s => s.id === a.subjectId)
        return { ...a, staffName: staff?.name, subjectName: subject?.name ? `${subject.name} - ${subject.section}`: 'Unknown' }
    }).filter(a => a.staffName && a.subjectName);
  }, [assignments]);

  const handleSave = () => {
    if(newAssignment.staffId && newAssignment.subjectId) {
        const exists = assignments.some(a => a.staffId === newAssignment.staffId && a.subjectId === newAssignment.subjectId);
        if (!exists) {
            setAssignments([...assignments, newAssignment]);
            toast({ title: "Success", description: "Assignment created." })
        } else {
            toast({ variant: "destructive", title: "Error", description: "This assignment already exists." })
        }
        setNewAssignment({ staffId: "", subjectId: "" });
        setIsModalOpen(false);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Please select both a staff and a subject." })
    }
  }
  
  const handleDelete = (staffId: string, subjectId: string) => {
    setAssignments(assignments.filter(a => !(a.staffId === staffId && a.subjectId === subjectId)))
    toast({ title: "Success", description: "Assignment deleted." })
  }
  
  const unassignedSubjects = useMemo(() => {
    const assignedSubjectIds = new Set(assignments.map(a => a.subjectId));
    return allSubjects.filter(s => !assignedSubjectIds.has(s.id));
  }, [assignments]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Staff-Subject Assignments</CardTitle>
              <CardDescription>Assign staff members to subjects.</CardDescription>
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
                        <DialogDescription>Select a staff member and a subject to assign.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff">Staff</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, staffId: value})}>
                                <SelectTrigger id="staff">
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Select onValueChange={(value) => setNewAssignment({...newAssignment, subjectId: value})}>
                                <SelectTrigger id="subject">
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {unassignedSubjects.length > 0 ? (
                                        unassignedSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - {s.section}</SelectItem>)
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">All subjects assigned.</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
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
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {assignedData.map((a) => (
                    <TableRow key={`${a.staffId}-${a.subjectId}`}>
                    <TableCell className="font-medium">{a.staffName}</TableCell>
                    <TableCell>{a.subjectName}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.staffId, a.subjectId)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
