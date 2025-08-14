// src/app/dashboard/admin/historical-attendance/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, FileDown, History, Loader2, Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import type { Batch, Subject, StaffAssignmentsResponse } from '@/types';

interface SubjectIdentifier {
  id: number;
  name: string;
}

interface HistoricalData {
  headers: { id: string; label: string }[];
  students: {
    id: number;
    roll_no: string;
    enrollment_no: string;
    name: string;
    attendance: Record<string, 'P' | 'A'>;
  }[];
}

export default function HistoricalAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Filter Data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<SubjectIdentifier[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignmentsResponse | null>(null);

  // Filter State
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLectureType, setSelectedLectureType] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [searchTerm, setSearchTerm] = useState('');

  // Report Data
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let batchesUrl = '';
      let subjectsUrl = '';
      let assignmentsUrl = '';

      if (user.role === 'admin') {
        batchesUrl = '/api/admin/batches';
        subjectsUrl = '/api/admin/subjects';
      } else if (user.role === 'hod') {
        batchesUrl = '/api/hod/batches';
        subjectsUrl = '/api/hod/subjects';
      } else { // staff
        assignmentsUrl = '/api/staff/assignments';
      }
      
      const [batchesRes, subjectsRes, assignmentsRes] = await Promise.all([
          batchesUrl ? fetch(batchesUrl) : Promise.resolve(null),
          subjectsUrl ? fetch(subjectsUrl) : Promise.resolve(null),
          assignmentsUrl ? fetch(assignmentsUrl) : Promise.resolve(null)
      ]);

      if (batchesRes) {
        if (!batchesRes.ok) throw new Error('Failed to fetch batches');
        setBatches(await batchesRes.json());
      }
      if (subjectsRes) {
        if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
        const subs = await subjectsRes.json()
        setSubjects(subs.map((s: Subject) => ({id: s.id, name: `${s.subject_name} (${s.subject_code})` })));
      }
      if (assignmentsRes) {
        if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments');
        const assignmentsData = await assignmentsRes.json();
        setStaffAssignments(assignmentsData);
        const uniqueBatches = [...new Map(assignmentsData.map((a: any) => [a.batch_id, {id: a.batch_id, dept_name: a.batch_name.split(' ')[0], class_number: a.batch_name.split(' ')[1]}])).values()];
        setBatches(uniqueBatches as Batch[]);
      }

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error loading filters', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleBatchChangeForStaff = useCallback((batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedSubjectId('');
    if (!staffAssignments) return;
    const relevantSubjects = staffAssignments
      .filter(a => String(a.batch_id) === batchId)
      .map(a => ({ id: a.subject_id, name: `${a.subject_name} (${a.subject_code})` }));
    const uniqueSubjects = [...new Map(relevantSubjects.map(s => [s.id, s])).values()];
    setSubjects(uniqueSubjects);
  }, [staffAssignments]);


  const fetchHistoricalData = useCallback(async () => {
    if (!selectedSubjectId || !selectedBatchId || !dateRange?.from || !dateRange?.to) {
        setHistoricalData(null);
        return;
    }
    setIsDataLoading(true);
    try {
        const params = new URLSearchParams({
            subject_id: selectedSubjectId,
            batch_id: selectedBatchId,
            start_date: format(dateRange.from, 'yyyy-MM-dd'),
            end_date: format(dateRange.to, 'yyyy-MM-dd'),
        });
        if (selectedLectureType) {
            params.append('lecture_type', selectedLectureType);
        }

        const res = await fetch(`/api/admin/historical-attendance?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch historical data');
        setHistoricalData(data);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        setHistoricalData(null);
    } finally {
        setIsDataLoading(false);
    }
  }, [selectedSubjectId, selectedBatchId, dateRange, selectedLectureType, toast]);
  
  useEffect(() => {
      fetchHistoricalData();
  }, [fetchHistoricalData])

  const filteredStudents = useMemo(() => {
    if (!historicalData?.students) return [];
    if (!searchTerm) return historicalData.students;
    const lowercasedFilter = searchTerm.toLowerCase();
    return historicalData.students.filter(
      (student) =>
        student.name.toLowerCase().includes(lowercasedFilter) ||
        student.roll_no.toLowerCase().includes(lowercasedFilter) ||
        student.enrollment_no.toLowerCase().includes(lowercasedFilter)
    );
  }, [historicalData, searchTerm]);

  const handleExportCSV = () => {
    if (!historicalData || filteredStudents.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }
    const { headers } = historicalData;
    const rows = [
      ['Roll No', 'Enrollment No', 'Name', ...headers.map(h => h.label)],
      ...filteredStudents.map(student => [
        student.roll_no,
        student.enrollment_no,
        `"${student.name}"`,
        ...headers.map(h => student.attendance[h.id] || '')
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historical_attendance_${selectedSubjectId}_${selectedBatchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Historical Attendance</CardTitle>
            <CardDescription>View a spreadsheet-style history of attendance for any subject.</CardDescription>
          </div>
          <Button onClick={handleExportCSV} disabled={!historicalData || isDataLoading}>
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label>Batch</Label>
            <Select onValueChange={user?.role === 'staff' ? handleBatchChangeForStaff : setSelectedBatchId} value={selectedBatchId} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
              <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.dept_name} {b.class_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={isLoading || !selectedBatchId}>
              <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lecture Type</Label>
            <Select onValueChange={setSelectedLectureType} value={selectedLectureType} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="TH">Theory</SelectItem>
                  <SelectItem value="PR">Practical</SelectItem>
                  <SelectItem value="TU">Tutorial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}` : format(dateRange.from, 'LLL dd, y')) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
           <div className="space-y-2 self-end">
             <Input placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
             <Search className="absolute h-4 w-4 text-muted-foreground mt-[-26px] ml-2" />
          </div>
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto border rounded-lg">
          {isDataLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {historicalData && filteredStudents.length > 0 ? (
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-20 w-28">Roll No</TableHead>
                  <TableHead className="sticky left-28 bg-card z-20 w-40">Enrollment No</TableHead>
                  <TableHead className="sticky left-68 bg-card z-20 w-48">Name</TableHead>
                  {historicalData.headers.map(header => <TableHead key={header.id} className="text-center whitespace-nowrap">{header.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 bg-card font-medium w-28">{student.roll_no}</TableCell>
                    <TableCell className="sticky left-28 bg-card w-40">{student.enrollment_no}</TableCell>
                    <TableCell className="sticky left-68 bg-card w-48">{student.name}</TableCell>
                    {historicalData.headers.map(header => (
                      <TableCell key={header.id} className={`text-center font-mono ${student.attendance[header.id] === 'A' ? 'text-destructive' : 'text-green-600'}`}>
                        {student.attendance[header.id] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
                {isDataLoading ? 'Loading data...' : 'Please select filters to view the report, or no data is available for this selection.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
