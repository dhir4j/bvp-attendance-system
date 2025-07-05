import Link from 'next/link';
import { BookCopy, ChevronRight } from 'lucide-react';
import { subjects } from '@/lib/data';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome Back!</h1>
        <p className="text-muted-foreground">Select a subject to mark attendance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects.map((subject) => (
          <Link href={`/attendance/${subject.id}`} key={subject.id} className="group h-full w-full max-w-sm mx-auto sm:max-w-none sm:mx-0">
            <Card className="hover:border-primary/80 transition-colors h-full flex flex-col hover:shadow-lg">
              <CardHeader className="flex-grow">
                <div className="flex items-start gap-4">
                  <BookCopy className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <CardTitle className="text-lg leading-tight">{subject.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Section {subject.section} &middot; {subject.students.length} Students
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                 <div className="flex items-center text-sm font-medium text-primary">
                  Mark Attendance
                  <ChevronRight className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
