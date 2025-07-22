// src/app/dashboard/admin/staff-assignments/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
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
import { useToast } from "@/hooks/use-toast"
import type { StaffAssignmentReport } from "@/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { UserCog } from "lucide-react"

export default function StaffAssignmentsReportPage() {
  const { toast } = useToast()
  const [report, setReport] = useState<StaffAssignmentReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/admin/staff-assignments');
        if(!res.ok) {
            throw new Error("Failed to fetch staff assignments report");
        }
        setReport(await res.json());
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <UserCog className="h-8 w-8 text-primary" />
            <div>
                <CardTitle>Staff Assignments Overview</CardTitle>
                <CardDescription>A complete list of all staff members and their assigned duties.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-8">Loading report...</div>
        ) : report.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No staff assignments found.</div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {report.map(staffMember => (
              <AccordionItem value={`staff-${staffMember.staff_id}`} key={staffMember.staff_id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                    {staffMember.staff_name}
                </AccordionTrigger>
                <AccordionContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Sub-Batch</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {staffMember.assignments.map((assignment) => (
                                <TableRow key={assignment.id}>
                                <TableCell>{assignment.subject_name}</TableCell>
                                <TableCell>{assignment.batch_name}</TableCell>
                                <TableCell>{assignment.lecture_type}</TableCell>
                                <TableCell>{assignment.batch_number ?? 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
