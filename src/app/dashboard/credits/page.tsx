// src/app/dashboard/credits/page.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ChevronsRight, Heart } from "lucide-react";

const creditsData = {
    chief: {
        name: "Dhiraj Kapse",
        title: "Chief Attendance Manager",
        quote: "“Because even my handwriting gave up on the registers.”"
    },
    why: "Because registers don’t auto-calculate percentages",
    mentions: [
        {
            name: "Mrs. Amrita Rathod",
            title: "AN Dept HOD",
            reason: "For giving the idea to create this website and save precious time."
        },
        {
            name: "Mr. Anuraag Rathod",
            title: "Vice Principal",
            reason: "For pushing me to complete this project (and not giving me a chance to escape!)."
        }
    ]
};

export default function CreditsPage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary animate-slide-up">For Staff Eyes Only</h1>
        <p className="text-lg text-muted-foreground mt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>The Great Minds Behind This Website</p>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="items-center text-center">
            <Award className="h-12 w-12 text-primary" />
            <CardTitle className="text-2xl">{creditsData.chief.name}</CardTitle>
            <CardDescription>{creditsData.chief.title}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-lg italic text-muted-foreground">{creditsData.chief.quote}</p>
        </CardContent>
      </Card>
      
      <Card className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <CardHeader>
            <CardTitle>Why This Exists?</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-lg flex items-center gap-2">
                <ChevronsRight className="h-5 w-5 text-primary"/>
                {creditsData.why}
            </p>
        </CardContent>
      </Card>
      
      <Card className="animate-slide-up" style={{ animationDelay: '0.8s' }}>
        <CardHeader>
            <CardTitle>Special Mentions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            {creditsData.mentions.map((mention, index) => (
                <div key={index} className="flex items-start gap-4">
                    <Heart className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-lg">{mention.name} – <span className="font-normal text-muted-foreground">{mention.title}</span></h4>
                        <p>{mention.reason}</p>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>

    </div>
  );
}
