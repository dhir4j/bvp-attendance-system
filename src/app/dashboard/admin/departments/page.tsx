// src/app/dashboard/admin/departments/page.tsx
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
import type { Department } from "@/types"

export default function DepartmentsPage() {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ dept_code: "", dept_name: "" })

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/departments")
      if (!res.ok) throw new Error("Failed to fetch departments")
      const data = await res.json()
      setDepartments(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const handleOpenModal = (dept: Department | null = null) => {
    setSelectedDept(dept)
    if (dept) {
      setFormData({ dept_code: dept.dept_code, dept_name: dept.dept_name })
    } else {
      setFormData({ dept_code: "", dept_name: "" })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDept(null)
  }

  const handleSave = async () => {
    const url = selectedDept ? `/api/admin/departments/${selectedDept.dept_code}` : "/api/admin/departments";
    const method = selectedDept ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${selectedDept ? 'update' : 'add'} department`)
      }
      toast({ title: "Success", description: `Department ${selectedDept ? 'updated' : 'added'}.` })
      fetchDepartments()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDelete = async (deptCode: string) => {
    if (!confirm("Are you sure you want to delete this department? This might affect subjects and classrooms.")) return;
    try {
        const res = await fetch(`/api/admin/departments/${deptCode}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete department");
        }
        toast({ title: "Success", description: "Department deleted." });
        fetchDepartments();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Department Management</CardTitle>
            <CardDescription>View, add, edit, or delete departments.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Department Code</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : departments.map((d) => (
                <TableRow key={d.dept_code}>
                  <TableCell className="font-medium">{d.dept_name}</TableCell>
                  <TableCell>{d.dept_code}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(d)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(d.dept_code)} className="text-destructive focus:text-destructive">
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
            <DialogTitle>{selectedDept ? "Edit Department" : "Add New Department"}</DialogTitle>
            <DialogDescription>
              {selectedDept ? "Update the details for this department." : "Enter the details for the new department."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Department Name</Label>
              <Input id="dept_name" value={formData.dept_name} onChange={(e) => setFormData({...formData, dept_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_code">Department Code</Label>
              <Input id="dept_code" value={formData.dept_code} onChange={(e) => setFormData({...formData, dept_code: e.target.value.toUpperCase()})} disabled={!!selectedDept} />
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
