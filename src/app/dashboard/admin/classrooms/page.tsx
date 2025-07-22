// src/app/dashboard/admin/classrooms/page.tsx
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
import type { Classroom, Department, Batch } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const initialFormData = {
  dept_code: "",
  class_name: "",
  batch_id: "" as string | number,
}

export default function ClassroomsPage() {
  const { toast } = useToast()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [formData, setFormData] = useState(initialFormData)

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [classroomsRes, deptsRes, batchesRes] = await Promise.all([
        fetch("/api/admin/classrooms"),
        fetch("/api/admin/departments"),
        fetch("/api/admin/batches"),
      ]);
      if (!classroomsRes.ok || !deptsRes.ok || !batchesRes.ok) throw new Error("Failed to fetch initial data");
      setClassrooms(await classroomsRes.json());
      setDepartments(await deptsRes.json());
      setBatches(await batchesRes.json());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenModal = (classroom: Classroom | null = null) => {
    setSelectedClassroom(classroom)
    if (classroom) {
      setFormData({ 
          dept_code: classroom.dept_code,
          class_name: classroom.class_name,
          batch_id: classroom.batch_id || "",
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

    const body = {
        ...formData,
        batch_id: formData.batch_id ? Number(formData.batch_id) : null
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${selectedClassroom ? 'update' : 'add'} classroom`)
      }
      toast({ title: "Success", description: `Classroom ${selectedClassroom ? 'updated' : 'added'}.` })
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDelete = async (classroomId: number) => {
    if (!confirm("Are you sure you want to delete this classroom?")) return;
    try {
        const res = await fetch(`/api/admin/classrooms/${classroomId}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete classroom");
        }
        toast({ title: "Success", description: "Classroom deleted." });
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
              <CardTitle>Classroom Management</CardTitle>
              <CardDescription>Create classrooms and assign batches to them.</CardDescription>
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
                  <TableHead>Classroom Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Assigned Batch</TableHead>
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
                    <TableCell>{c.batch_info || 'N/A'}</TableCell>
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
      </Card>

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
                <Label htmlFor="dept_code">Department</Label>
                <Select value={formData.dept_code} onValueChange={(value) => setFormData({...formData, dept_code: value})}>
                    <SelectTrigger id="dept_code">
                        <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map(d => <SelectItem key={d.dept_code} value={d.dept_code}>{d.dept_name} ({d.dept_code})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_name">Classroom Name</Label>
              <Input id="class_name" value={formData.class_name} placeholder="e.g. Room 501, Lab A" onChange={(e) => setFormData({...formData, class_name: e.target.value})} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="batch_id">Assign Batch (Optional)</Label>
                <Select value={String(formData.batch_id)} onValueChange={(value) => setFormData({...formData, batch_id: value})}>
                    <SelectTrigger id="batch_id">
                        <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.dept_name} - {b.class_number} ({b.academic_year})</SelectItem>)}
                    </SelectContent>
                </Select>
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
