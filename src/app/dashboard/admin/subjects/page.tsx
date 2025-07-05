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
import { subjects as initialSubjects } from "@/lib/data"
import type { Subject } from "@/types"

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [formData, setFormData] = useState({ id: "", name: "", section: "", totalLectures: 0 })
  
  const handleOpenModal = (subject: Subject | null = null) => {
    setSelectedSubject(subject)
    if (subject) {
      setFormData({ id: subject.id, name: subject.name, section: subject.section, totalLectures: subject.totalLectures })
    } else {
      setFormData({ id: "", name: "", section: "", totalLectures: 20 })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSubject(null)
    setFormData({ id: "", name: "", section: "", totalLectures: 0 })
  }

  const handleSave = () => {
    if (selectedSubject) {
      setSubjects(subjects.map(s => s.id === selectedSubject.id ? { ...s, ...formData } : s))
    } else {
      const newSubject = { ...formData, id: `sub-${Date.now()}`, students: [] }
      setSubjects([...subjects, newSubject])
    }
    handleCloseModal()
  }
  
  const handleDelete = (subjectId: string) => {
    setSubjects(subjects.filter(s => s.id !== subjectId))
  }

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
                <TableHead>Section</TableHead>
                <TableHead className="hidden sm:table-cell">Total Lectures</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.section}</TableCell>
                  <TableCell className="hidden sm:table-cell">{s.totalLectures}</TableCell>
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input id="section" value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="lectures">Total Lectures</Label>
              <Input id="lectures" type="number" value={formData.totalLectures} onChange={(e) => setFormData({...formData, totalLectures: parseInt(e.target.value) || 0})} />
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
