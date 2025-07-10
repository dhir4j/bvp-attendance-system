import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { headers } from "next/headers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = headers().get('x-next-pathname') || '';
  const isAdmin = pathname.includes('/admin');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar isAdmin={isAdmin} />
        <SidebarInset className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-6 md:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold font-headline">BVP Attendance</h1>
          </header>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
