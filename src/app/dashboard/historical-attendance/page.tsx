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
import { CalendarIcon, FileDown, Loader2, Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import type { Batch, Subject, Department, StaffAssignmentsResponse } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
    batch_number?: number | null;
    attendance: Record<string, 'P' | 'A'>;
  }[];
}

export default function HistoricalAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDependentLoading, setIsDependentLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Filter Data Source
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<SubjectIdentifier[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignmentsResponse | null>(null);
  
  // Selected Filter State
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLectureType, setSelectedLectureType] = useState('');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [searchTerm, setSearchTerm] = useState('');

  // Report Data
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);

  const apiPrefix = useMemo(() => {
    if (user?.role === 'admin') return '/api/admin';
    if (user?.role === 'hod') return '/api/hod';
    if (user?.role === 'staff') return '/api/staff';
    return '';
  }, [user?.role]);

  // Fetch initial data based on user role
  const fetchInitialData = useCallback(async () => {
    if (!apiPrefix) return;
    setIsInitialLoading(true);
    try {
      if (user?.role === 'admin') {
        const res = await fetch(`${apiPrefix}/departments`);
        if (!res.ok) throw new Error('Failed to fetch departments');
        setDepartments(await res.json());
      } else if (user?.role === 'hod') {
        const [batchesRes, subjectsRes] = await Promise.all([
          fetch(`${apiPrefix}/batches`),
          fetch(`${apiPrefix}/subjects`)
        ]);
        if (!batchesRes.ok) throw new Error('Failed to fetch HOD batches');
        if (!subjectsRes.ok) throw new Error('Failed to fetch HOD subjects');
        setBatches(await batchesRes.json());
        const subs: Subject[] = await subjectsRes.json()
        setSubjects(subs.map(s => ({ id: s.id, name: `${s.subject_name} (${s.subject_code})` })));

      } else if (user?.role === 'staff') {
        const res = await fetch(`${apiPrefix}/assignments`);
        if (!res.ok) throw new Error('Failed to fetch staff assignments');
        const assignmentsData: any[] = await res.json();
        setStaffAssignments(assignmentsData);
        const uniqueBatches = Array.from(new Map(assignmentsData.map(a => [a.batch_id, { id: a.batch_id, dept_name: a.batch_name.split(' (')[0] }])).values());
        setBatches(uniqueBatches as Batch[]);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error loading filters', description: error.message });
    } finally {
      setIsInitialLoading(false);
    }
  }, [user, toast, apiPrefix]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle department change for Admin
  const handleDeptChange = async (deptCode: string) => {
    setSelectedDeptCode(deptCode);
    setSelectedBatchId('');
    setSelectedSubjectId('');
    setSelectedLectureType('');
    setSelectedBatchNumber('');
    setBatches([]);
    setSubjects([]);
    setHistoricalData(null);
    if (!deptCode) return;
    
    setIsDependentLoading(true);
    try {
        const res = await fetch(`/api/admin/batches-by-department/${deptCode}`);
        if (!res.ok) throw new Error('Failed to fetch batches for department');
        setBatches(await res.json());
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsDependentLoading(false);
    }
  };

  // Handle batch change for all roles except HOD (HOD subjects are pre-loaded)
  const handleBatchChange = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedSubjectId('');
    setSelectedLectureType('');
    setSelectedBatchNumber('');
    setSubjects([]);
    setHistoricalData(null);
    if (!batchId) return;

    let url = '';
    // HODs already have subjects loaded, so we only need to fetch for Admin and Staff
    if (user?.role === 'admin') url = `/api/admin/subjects/by-batch/${batchId}`;
    else if (user?.role === 'staff') url = `/api/staff/subjects/by-batch/${batchId}`;
    else if (user?.role === 'hod') {
        // For HOD, filter pre-loaded subjects that are in this batch
        const hodSubjectsForBatchUrl = `/api/hod/subjects-by-batch/${batchId}`;
        setIsDependentLoading(true);
        try {
            const res = await fetch(hodSubjectsForBatchUrl);
            if (!res.ok) throw new Error('Failed to fetch subjects for batch');
            setSubjects(await res.json());
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsDependentLoading(false);
        }
        return; // exit early
    }
    
    if (!url) return;

    setIsDependentLoading(true);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch subjects for batch');
        setSubjects(await res.json());
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsDependentLoading(false);
    }
  };

  const fetchHistoricalData = useCallback(async () => {
    if (!selectedSubjectId || !selectedBatchId || !selectedLectureType || !dateRange?.from || !dateRange?.to) {
        return;
    }
    setIsDataLoading(true);
    setHistoricalData(null);
    try {
        const params = new URLSearchParams({
            subject_id: selectedSubjectId,
            batch_id: selectedBatchId,
            start_date: format(dateRange.from, 'yyyy-MM-dd'),
            end_date: format(dateRange.to, 'yyyy-MM-dd'),
            lecture_type: selectedLectureType,
        });
        if (selectedBatchNumber) {
            params.append('batch_number', selectedBatchNumber);
        }
       
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
  }, [selectedSubjectId, selectedBatchId, dateRange, selectedLectureType, selectedBatchNumber, toast]);
  
  const handleGenerateReport = () => {
      if (!selectedSubjectId || !selectedBatchId || !selectedLectureType) {
        toast({ variant: 'destructive', title: 'Missing Filters', description: "Please select all required filters to generate the report."});
        return;
      }
      fetchHistoricalData();
  }

  const filteredStudents = useMemo(() => {
    if (!historicalData?.students) return [];

    let students = historicalData.students;
    if (user?.role === 'staff' && selectedLectureType !== 'TH' && selectedBatchNumber) {
        students = students.filter(s => s.batch_number === parseInt(selectedBatchNumber, 10));
    }

    if (!searchTerm) return students;
    
    const lowercasedFilter = searchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(lowercasedFilter) ||
        student.roll_no.toLowerCase().includes(lowercasedFilter) ||
        student.enrollment_no.toLowerCase().includes(lowercasedFilter)
    );
  }, [historicalData, searchTerm, user?.role, selectedLectureType, selectedBatchNumber]);
  
  const assignedLectureTypes = useMemo(() => {
    if (user?.role !== 'staff' || !selectedSubjectId || !selectedBatchId || !staffAssignments) {
        return [{label: 'Theory', value: 'TH'}, {label: 'Practical', value: 'PR'}, {label: 'Tutorial', value: 'TU'}];
    }
    const relevantAssignments = staffAssignments.filter(a => 
      String(a.batch_id) === selectedBatchId && String(a.subject_id) === selectedSubjectId
    );
    if (!relevantAssignments.length) return [];
    
    const types = new Set<string>();
    relevantAssignments.forEach(a => {
        Object.keys(a.lecture_types).forEach(type => types.add(type));
    });

    return Array.from(types).map(type => ({
      value: type,
      label: type === 'TH' ? 'Theory' : type === 'PR' ? 'Practical' : 'Tutorial'
    }));
  }, [user?.role, staffAssignments, selectedBatchId, selectedSubjectId]);

  const subBatchNumbers = useMemo(() => {
    if (!selectedLectureType || selectedLectureType === 'TH') return [];
    
    if (user?.role === 'staff' && staffAssignments) {
         const relevantAssignment = staffAssignments.find(a => 
            String(a.batch_id) === selectedBatchId && 
            String(a.subject_id) === selectedSubjectId &&
            a.lecture_types[selectedLectureType]
        );
        return relevantAssignment?.lecture_types[selectedLectureType]?.filter(n => n !== null) as number[] || [];
    }
    
    // For Admin/HOD, find all possible batch numbers from all assignments for that class
    if ((user?.role === 'admin' || user?.role === 'hod') && historicalData?.students) {
       const numbers = new Set<number>();
       historicalData.students.forEach(s => {
           if (s.batch_number) {
               numbers.add(s.batch_number);
           }
       });
       return Array.from(numbers).sort();
    }

    return [];
  }, [selectedLectureType, user?.role, staffAssignments, historicalData, selectedBatchId, selectedSubjectId]);


  useEffect(() => {
    // For staff, if there's only one sub-batch for the selected type, auto-select it.
    if (user?.role === 'staff' && subBatchNumbers.length === 1) {
      setSelectedBatchNumber(String(subBatchNumbers[0]));
    } else {
      setSelectedBatchNumber('');
    }
  }, [user?.role, subBatchNumbers]);

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
        `"${student.name.replace(/"/g, '""')}"`,
        ...headers.map(h => student.attendance[h.id] || 'A')
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

  const showBatchNumberFilter = selectedLectureType && selectedLectureType !== 'TH';
  const allFiltersSelected = selectedBatchId && selectedSubjectId && selectedLectureType && (!showBatchNumberFilter || selectedBatchNumber);

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
            <Button onClick={handleGenerateReport} disabled={isDataLoading || !selectedBatchId || !selectedSubjectId || !selectedLectureType}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 p-4 border rounded-lg">
          
          {user?.role === 'admin' && (
            <div className="space-y-2">
              <Label>Department</Label>
              <Select onValueChange={handleDeptChange} value={selectedDeptCode} disabled={isInitialLoading}>
                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.dept_code} value={d.dept_code}>{d.dept_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Batch</Label>
            <Select onValueChange={handleBatchChange} value={selectedBatchId} disabled={isInitialLoading || (user?.role === 'admin' && !selectedDeptCode)}>
              <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
              <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.dept_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={isDependentLoading || !selectedBatchId}>
              <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Lecture Type</Label>
            <Select onValueChange={setSelectedLectureType} value={selectedLectureType} disabled={!selectedSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent>
                  {assignedLectureTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {showBatchNumberFilter && (
            <div className="space-y-2">
              <Label>Sub-Batch</Label>
              <Select onValueChange={setSelectedBatchNumber} value={selectedBatchNumber} disabled={!selectedLectureType || (user?.role==='staff' && subBatchNumbers.length === 1)}>
                <SelectTrigger><SelectValue placeholder="Select Sub-Batch" /></SelectTrigger>
                <SelectContent>
                    {subBatchNumbers.map(num => (
                        <SelectItem key={num} value={String(num)}>Batch {num}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
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
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="relative">
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
                          {student.attendance[header.id] || 'A'}
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
    </div>
  );
}
