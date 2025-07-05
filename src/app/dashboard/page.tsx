import Link from 'next/link';
import Image from 'next/image';
import { BookCopy, ChevronRight, Users, User } from 'lucide-react';
import { subjects, staff } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const totalStudents = new Set(subjects.flatMap(s => s.students.map(st => st.rollNumber))).size;

  const stats = [
    { title: "Total Subjects", value: subjects.length, icon: BookCopy },
    { title: "Total Staff", value: staff.length, icon: Users },
    { title: "Total Students", value: totalStudents, icon: User },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome Back!</h1>
        <p className="text-muted-foreground">Here's an overview of your school's metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-2">
        <h2 className="text-2xl font-bold font-headline">Your Subjects</h2>
        <p className="text-muted-foreground">Select a subject to mark attendance.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects.map((subject) => (
          <Link href={`/attendance/${subject.id}`} key={subject.id} className="group block">
            <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl hover:border-primary/80 h-full flex flex-col">
              <div className="relative h-40 w-full">
                <Image
                  src={`https://placehold.co/600x400.png`}
                  alt={subject.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  data-ai-hint="education classroom"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-lg font-bold text-white font-headline">{subject.name}</h3>
                  <p className="text-sm text-white/80">Section {subject.section}</p>
                </div>
              </div>
              <CardContent className="p-4 flex-grow flex flex-col justify-between">
                <Badge variant="secondary">{subject.students.length} Students</Badge>
                <div className="flex items-center text-sm font-medium text-primary mt-4">
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
