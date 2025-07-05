"use client"

import { useState } from "react"
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
import { staff as initialStaff } from "@/lib/data"
import type { Staff } from "@/types"

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>(initialStaff)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({ id: "", name: "", email: "" })
  
  const handleOpenModal = (staffMember: Staff | null = null) => {
    setSelectedStaff(staffMember)
    if (staffMember) {
      setFormData({ id: staffMember.id, name: staffMember.name, email: staffMember.email })
    } else {
      setFormData({ id: "", name: "", email: "" })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedStaff(null)
    setFormData({ id: "", name: "", email: "" })
  }

  const handleSave = () => {
    if (selectedStaff) {
      setStaff(staff.map(s => s.id === selectedStaff.id ? { ...s, ...formData } : s))
    } else {
      const newStaff = { ...formData, id: `staff-${Date.now()}` }
      setStaff([...staff, newStaff])
    }
    handleCloseModal()
  }
  
  const handleDelete = (staffId: string) => {
    setStaff(staff.filter(s => s.id !== staffId))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Staff Management</CardTitle>
            <CardDescription>View, add, edit, or delete staff members.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{s.email}</TableCell>
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
            <DialogTitle>{selectedStaff ? "Edit Staff" : "Add New Staff"}</DialogTitle>
            <DialogDescription>
              {selectedStaff ? "Update the details for this staff member." : "Enter the details for the new staff member."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
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
