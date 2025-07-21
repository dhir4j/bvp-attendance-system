"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShieldAlert } from "lucide-react";

export default function DefaultersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Defaulter List</h1>
        <p className="text-muted-foreground">
          This feature is currently unavailable.
        </p>
      </div>

      <Card className="flex items-center justify-center py-24">
            <div className="text-center text-muted-foreground">
                <ShieldAlert className="mx-auto h-12 w-12 mb-4" />
                <p className="font-bold">Feature Not Implemented</p>
                <p className="text-sm">The backend API does not currently support defaulter lists.</p>
            </div>
        </Card>
    </div>
  )
}
