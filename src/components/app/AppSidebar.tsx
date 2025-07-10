"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookCopy, Home, LogOut, Shield, User } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"

interface AppSidebarProps {
    isAdmin: boolean;
}

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const pathname = usePathname()

  const staffMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
  ]

  const adminMenuItems = [
      { href: "/dashboard/admin", label: "Admin Panel", icon: Shield },
  ]
  
  const menuItems = isAdmin ? adminMenuItems : staffMenuItems;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <BookCopy className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-headline font-bold leading-tight">BVP Attendance</h1>
            <p className="text-xs text-muted-foreground">{isAdmin ? "Admin" : "Staff"}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
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
        <SidebarMenu>
          <SidebarMenuItem>
             <SidebarMenuButton asChild className="bg-transparent hover:bg-destructive/20">
                <Link href="/">
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
