// src/app/dashboard/historical-attendance/page.tsx
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
      
      if (user.role === 'admin') {
        batchesUrl = '/api/admin/batches';
        subjectsUrl = '/api/admin/subjects';
      } else if (user.role === 'hod') {
        batchesUrl = '/api/hod/batches';
        subjectsUrl = '/api/hod/subjects';
      } else { // staff
        const assignmentsRes = await fetch('/api/staff/assignments');
        if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments');
        const assignmentsData: StaffAssignmentsResponse = await assignmentsRes.json();
        
        const uniqueBatches = Array.from(new Map(assignmentsData.map(a => [a.batch_id, { id: a.batch_id, dept_name: a.batch_name.split(' ')[0], class_number: a.batch_name.split(' ')[1] }])).values());
        setBatches(uniqueBatches as Batch[]);
        
        // For staff, subjects depend on batch, so we don't fetch them here.
        setIsLoading(false);
        return;
      }
      
      const [batchesRes, subjectsRes] = await Promise.all([
        fetch(batchesUrl),
        fetch(subjectsUrl)
      ]);

      if (!batchesRes.ok) throw new Error('Failed to fetch batches');
      setBatches(await batchesRes.json());
      
      if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
      const subs = await subjectsRes.json()
      setSubjects(subs.map((s: Subject) => ({id: s.id, name: `${s.subject_name} (${s.subject_code})` })));

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error loading filters', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleBatchChange = useCallback(async (batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedSubjectId('');
    setSubjects([]); // Clear previous subjects
    if (!batchId) return;

    // Only staff needs to fetch subjects dynamically based on batch
    if (user?.role === 'staff') {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/staff/subjects/by-batch/${batchId}`);
            if (!res.ok) throw new Error('Failed to fetch subjects for batch');
            setSubjects(await res.json());
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
  }, [user, toast]);


  const fetchHistoricalData = useCallback(async () => {
    if (!selectedSubjectId || !selectedBatchId || !selectedLectureType || !dateRange?.from || !dateRange?.to) {
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
            lecture_type: selectedLectureType,
        });
       
        const res = await fetch(`/api/historical-attendance?${params.toString()}`);
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
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-3xl font-bold font-headline">Historical Attendance</h1>
        <p className="text-muted-foreground">View a spreadsheet-style history of attendance for any subject.</p>
      </div>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select filters to generate the report.</CardDescription>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Button onClick={fetchHistoricalData} disabled={isDataLoading || !selectedBatchId || !selectedSubjectId || !selectedLectureType}>
              {isDataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
               Generate Report
            </Button>
            <Button onClick={handleExportCSV} disabled={!historicalData || isDataLoading} variant="outline">
              <FileDown className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label>Batch</Label>
            <Select onValueChange={handleBatchChange} value={selectedBatchId} disabled={isLoading}>
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
              <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent>
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
                {isDataLoading ? 'Loading data...' : 'Please select all filters and click "Generate Report" to view data.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
