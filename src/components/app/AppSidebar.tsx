
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookCopy, Home, LogOut, Shield, FileBarChart, UserX } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
    { href: "/dashboard/defaulters", label: "Defaulters", icon: UserX },
    { href: "/dashboard/admin", label: "Admin Panel", icon: Shield },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <BookCopy className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-headline font-bold">BVP Attendance</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                className="bg-transparent data-[active=true]:bg-primary/20 data-[active=true]:text-primary-foreground"
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
