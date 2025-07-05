import Link from 'next/link';
import { BookUser, ChevronRight } from 'lucide-react';
import { subjects } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Subjects Dashboard</h1>
        <p className="text-muted-foreground">Select a subject to mark attendance.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Link href={`/attendance/${subject.id}`} key={subject.id} className="group">
            <Card className="hover:border-primary/80 hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline text-xl">{subject.name}</CardTitle>
                    <CardDescription>Section {subject.section}</CardDescription>
                  </div>
                  <BookUser className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="flex justify-between items-center mt-auto">
                <Badge variant="secondary">{subject.students.length} Students</Badge>
                <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  Mark Attendance
                  <ChevronRight className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
