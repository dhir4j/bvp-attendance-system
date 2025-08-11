"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, KeyRound, LogIn, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { useAuth } from '@/hooks/use-auth';

export default function HODLoginPage() {
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
      const res = await fetch('/api/hod/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: "Success", description: "HOD logged in successfully." });
        login({ 
          name: data.full_name, 
          role: 'hod',
          department_code: data.department_code,
        });
        router.push('/dashboard/admin/subjects'); // Redirect HODs to a relevant admin page
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
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 animate-fade-in">
        <div className="absolute top-4 right-4">
            <ThemeToggle />
        </div>
      <Card className="w-full max-w-sm shadow-2xl animate-slide-up">
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-3xl font-headline">HOD Login</CardTitle>
          <CardDescription>Head of Department Portal</CardDescription>
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
                    <Link href="/">Staff Login</Link>
                </Button>
                 <Button variant="link" size="sm" asChild>
                    <Link href="/login/admin">Admin Login</Link>
                </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
