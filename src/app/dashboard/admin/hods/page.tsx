// src/app/dashboard/admin/hods/page.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { HOD, Staff, Department } from "@/types"

export default function HODManagementPage() {
  const { toast } = useToast()
  const [hods, setHods] = useState<HOD[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedHod, setSelectedHod] = useState<HOD | null>(null)
  const [formData, setFormData] = useState({ staff_id: "", dept_code: "" })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [hodsRes, staffRes, deptsRes] = await Promise.all([
        fetch("/api/admin/hods"),
        fetch("/api/admin/staff"),
        fetch("/api/admin/departments"),
      ])
      if (!hodsRes.ok || !staffRes.ok || !deptsRes.ok) {
        throw new Error("Failed to fetch necessary data")
      }
      setHods(await hodsRes.json())
      setStaff(await staffRes.json())
      setDepartments(await deptsRes.json())
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenModal = (hod: HOD | null = null) => {
    setSelectedHod(hod)
    if (hod) {
      setFormData({ staff_id: String(hod.staff_id), dept_code: hod.dept_code })
    } else {
      setFormData({ staff_id: "", dept_code: "" })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedHod(null)
  }

  const handleSave = async () => {
    const url = selectedHod ? `/api/admin/hods/${selectedHod.id}` : "/api/admin/hods";
    const method = selectedHod ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...formData,
            staff_id: parseInt(formData.staff_id)
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${selectedHod ? 'update' : 'add'} HOD`)
      }
      toast({ title: "Success", description: `HOD ${selectedHod ? 'updated' : 'added'}.` })
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleDelete = async (hodId: number) => {
    if (!confirm("Are you sure you want to remove this HOD assignment?")) return;
    try {
        const res = await fetch(`/api/admin/hods/${hodId}`, { method: "DELETE" });
        if(!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete HOD");
        }
        toast({ title: "Success", description: "HOD assignment deleted." });
        fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }
  
  const availableStaff = staff.filter(s => !hods.some(h => h.staff_id === s.id) || (selectedHod && selectedHod.staff_id === s.id));
  const availableDepts = departments.filter(d => !hods.some(h => h.dept_code === d.dept_code) || (selectedHod && selectedHod.dept_code === d.dept_code));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>HOD Management</CardTitle>
            <CardDescription>Assign Head of Departments to specific departments.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Assign HOD
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member (HOD)</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : hods.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.staff_name}</TableCell>
                  <TableCell>{h.dept_name}</TableCell>
                  <TableCell>{h.username}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(h)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(h.id)} className="text-destructive focus:text-destructive">
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
            <DialogTitle>{selectedHod ? "Edit HOD Assignment" : "Assign New HOD"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select onValueChange={(value) => setFormData({...formData, staff_id: value})} value={formData.staff_id} disabled={!!selectedHod}>
                <SelectTrigger id="staff">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select onValueChange={(value) => setFormData({...formData, dept_code: value})} value={formData.dept_code}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepts.map(d => <SelectItem key={d.dept_code} value={d.dept_code}>{d.dept_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSave}>Save Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
