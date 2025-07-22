// src/app/dashboard/admin/layout.tsx
"use client"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage staff, subjects, assignments, and view reports.
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
