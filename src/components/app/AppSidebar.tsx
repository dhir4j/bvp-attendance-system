// src/components/app/AppSidebar.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, LogOut, FileBarChart, UserX, Users, Book, Link as LinkIcon, School2, Building, UserCog, Award, Pencil, UserPlus } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "./ThemeToggle"
import { useAuth } from "@/hooks/use-auth"

const staffItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
    { href: "/dashboard/defaulters", label: "Defaulters", icon: UserX },
    { href: "/dashboard/credits", label: "Credits", icon: Award },
]

const adminItems = [
    { href: "/dashboard/admin/staff", label: "Staff", icon: Users },
    { href: "/dashboard/admin/hods", label: "HODs", icon: UserPlus },
    { href: "/dashboard/admin/departments", label: "Departments", icon: Building },
    { href: "/dashboard/admin/subjects", label: "Subjects", icon: Book },
    { href: "/dashboard/admin/batches", label: "Batches", icon: School2 },
    { href: "/dashboard/admin/assignments", label: "Assignments", icon: LinkIcon },
    { href: "/dashboard/admin/staff-assignments", label: "Staff Assignments", icon: UserCog },
    { href: "/dashboard/admin/report", label: "Reports", icon: FileBarChart },
    { href: "/dashboard/admin/edit-attendance", label: "Edit Attendance", icon: Pencil },
]

const hodItems = [
    { href: "/dashboard/admin/subjects", label: "Subjects", icon: Book },
    { href: "/dashboard/admin/assignments", label: "Assignments", icon: LinkIcon },
]


export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  
  const isAdminSection = pathname.startsWith("/dashboard/admin");
  
  let menuItems = staffItems;
  if (isAdminSection) {
      if (user?.role === 'admin') {
          menuItems = adminItems;
      } else if (user?.role === 'hod') {
          // HODs see a subset of admin pages
          menuItems = hodItems;
      }
  }

  const logoutHref = user?.role === 'admin' ? "/login/admin" : user?.role === 'hod' ? "/login/hod" : "/";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Image src="/images/bvp.png" alt="BVP Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-xl font-headline font-bold">BVP Attendance</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between p-2">
            <SidebarMenu className="flex-row gap-0.5">
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="bg-transparent hover:bg-destructive/20 h-8 w-auto px-3">
                        <Link href={logoutHref}>
                            <LogOut className="h-5 w-5" />
                            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
