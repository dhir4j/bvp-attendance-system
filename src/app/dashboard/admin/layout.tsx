// src/app/dashboard/admin/layout.tsx
"use client"
import { useAuth } from "@/hooks/use-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const title = user?.role === 'hod' ? "HOD Panel" : "Admin Panel";
  const description = user?.role === 'hod' 
    ? "Manage subjects, assignments, and view reports for your department."
    : "Manage staff, subjects, assignments, and view reports.";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
