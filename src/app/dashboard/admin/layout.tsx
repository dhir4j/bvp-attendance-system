// src/app/dashboard/admin/layout.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Book, Link as LinkIcon, FileBarChart, School2, Building } from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const getTabValue = () => {
    if (pathname.startsWith("/dashboard/admin/subjects")) return "subjects"
    if (pathname.startsWith("/dashboard/admin/assignments")) return "assignments"
    if (pathname.startsWith("/dashboard/admin/report")) return "report"
    if (pathname.startsWith("/dashboard/admin/batches")) return "batches"
    if (pathname.startsWith("/dashboard/admin/departments")) return "departments"
    return "staff"
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage staff, subjects, assignments, and view reports.
        </p>
      </div>
      <Tabs value={getTabValue()} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto sm:h-10">
          <TabsTrigger value="staff" asChild>
            <Link href="/dashboard/admin/staff"><Users className="mr-2 h-4 w-4" />Staff</Link>
          </TabsTrigger>
           <TabsTrigger value="departments" asChild>
            <Link href="/dashboard/admin/departments"><Building className="mr-2 h-4 w-4" />Departments</Link>
          </TabsTrigger>
          <TabsTrigger value="subjects" asChild>
            <Link href="/dashboard/admin/subjects"><Book className="mr-2 h-4 w-4" />Subjects</Link>
          </TabsTrigger>
           <TabsTrigger value="batches" asChild>
            <Link href="/dashboard/admin/batches"><School2 className="mr-2 h-4 w-4" />Batches</Link>
          </TabsTrigger>
          <TabsTrigger value="assignments" asChild>
             <Link href="/dashboard/admin/assignments"><LinkIcon className="mr-2 h-4 w-4" />Assignments</Link>
          </TabsTrigger>
          <TabsTrigger value="report" asChild>
             <Link href="/dashboard/admin/report"><FileBarChart className="mr-2 h-4 w-4" />Reports</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4">{children}</div>
    </div>
  )
}
```