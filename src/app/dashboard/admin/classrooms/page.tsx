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
import type { Classroom } from "@/types"

const initialFormData = {
    id: 0,
    dept_code: "",
    class_name: "",
    batch_id: null as number | null,
};

export default function ClassroomsPage() {
  const { toast } = useToast()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [formData, setFormData] = useState(initialFormData)

  const fetchClassrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/classrooms")
      if (!res.ok) throw new Error("Failed to fetch classrooms")
      const data = await res.json()
      setClassrooms(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  const handleOpenModal = (classroom: Classroom | null = null) => {
    setSelectedClassroom(classroom)
    if (classroom) {
      setFormData({
        id: classroom.id,
        dept_code: classroom.dept_code,
        class_name: classroom.class_name,
        batch_id: classroom.batch_id,
      })
    } else {
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedClassroom(null)
  }

  const handleSave = async () => {
    const url = selectedClassroom ? `/api/admin/classrooms/${selectedClassroom.id}` : "/api/admin/classrooms";
    const method = selectedClassroom ? "PUT" : "POST";
    
    if (!formData.dept_code || !formData.class_name) {
        toast({variant: "destructive", title: "Error", description: "Department and Class Name are required."})
        return
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            dept_code: formData.dept_code,
            class_name: formData.class_name,
            batch_id: formData.batch_id
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${selectedClassroom ? 'update' : 'add'} classroom`)
      }
      toast({ title: "Success", description: `Classroom ${selectedClassroom ? 'updated' : 'added'}.` })
      fetchClassrooms()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDelete = async (classroomId: number) => {
    if (!confirm("Are you sure you want to delete this classroom? This may affect existing assignments.")) return;
    try {
        const res = await fetch(`/api/admin/classrooms/${classroomId}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete classroom");
        }
        toast({ title: "Success", description: "Classroom deleted." });
        fetchClassrooms();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Classroom Management</CardTitle>
            <CardDescription>View, add, edit, or delete classrooms.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Classroom
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
                <TableHead>Associated Batch ID</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : classrooms.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.class_name}</TableCell>
                  <TableCell>{c.dept_code}</TableCell>
                  <TableCell>{c.batch_id || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(c)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive focus:text-destructive">
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
            <DialogTitle>{selectedClassroom ? "Edit Classroom" : "Add New Classroom"}</DialogTitle>
            <DialogDescription>
              {selectedClassroom ? "Update the details for this classroom." : "Enter the details for the new classroom."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class_name">Class Name</Label>
              <Input id="class_name" value={formData.class_name} onChange={(e) => setFormData({...formData, class_name: e.target.value})} placeholder="e.g., AN1, CO2-A, LT-401"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_code">Department Code</Label>
              <Input id="dept_code" value={formData.dept_code} onChange={(e) => setFormData({...formData, dept_code: e.target.value})} placeholder="e.g., AN, CO, ME"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch_id">Associated Batch ID (Optional)</Label>
              <Input id="batch_id" type="number" value={formData.batch_id ?? ""} onChange={(e) => setFormData({...formData, batch_id: e.target.value ? parseInt(e.target.value) : null})} placeholder="Enter a numeric Batch ID"/>
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
