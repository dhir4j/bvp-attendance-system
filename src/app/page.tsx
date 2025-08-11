"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, KeyRound, LogIn, User, BookCheck, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Logged in successfully." });
        login({ name: data.full_name, role: 'staff' });
        router.push('/dashboard');
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background animate-fade-in">
       <div className="absolute top-4 right-4 z-20">
            <ThemeToggle />
        </div>
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-20">
          
          {/* Hero Section */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <BookCheck className="h-16 w-16 text-primary" />
            <h1 className="mt-4 text-4xl font-bold font-headline tracking-tighter sm:text-5xl lg:text-6xl">
              Vidyavardhini's Bhausaheb Vartak Polytechnic Attendance System
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              The modern solution for managing college attendance. Log in to streamline your workflow, generate reports, and focus on what matters most.
            </p>
             <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                <Award className="h-5 w-5 text-primary" />
                <span>Created by Mr. Dhiraj Kapse</span>
            </div>
          </div>

          {/* Login Form */}
          <Card className="w-full max-w-sm shadow-2xl animate-slide-up mx-auto md:mx-0">
            <CardHeader className="text-center">
              <User className="mx-auto h-12 w-12 text-primary mb-2" />
              <CardTitle className="text-3xl font-headline">Staff Portal</CardTitle>
              <CardDescription>Log in to manage attendance</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="username" 
                      type="text" 
                      placeholder="your.username" 
                      required 
                      className="pl-10" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      required 
                      className="pl-10" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
                <div className="flex justify-between w-full">
                    <Button variant="link" size="sm" asChild>
                        <Link href="/login/hod">HOD Login</Link>
                    </Button>
                    <Button variant="link" size="sm" asChild>
                        <Link href="/login/admin">Admin Login</Link>
                    </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
