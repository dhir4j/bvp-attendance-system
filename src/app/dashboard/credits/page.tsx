// src/app/dashboard/credits/page.tsx
"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Award, HelpCircle, Heart, UserCheck } from "lucide-react";

const creditsData = {
    chief: {
        name: "Dhiraj Kapse",
        title: "Chief Attendance Manager",
        quote: "“Because even my handwriting gave up on the registers.”"
    },
    why: "Because registers are allergic to neat handwriting.",
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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary animate-slide-up">For Staff Eyes Only</h1>
        <p className="text-lg text-muted-foreground mt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>Click to reveal the secrets behind this website.</p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <AccordionItem value="item-1" className="border rounded-lg bg-card shadow-lg px-4">
          <AccordionTrigger className="text-xl hover:no-underline">
            <div className="flex items-center gap-3">
                <UserCheck className="h-6 w-6 text-primary" />
                The Great Minds Behind This Website
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 text-base">
             <div className="text-center p-4 rounded-lg">
                <Award className="mx-auto h-12 w-12 text-primary" />
                <h3 className="text-2xl font-bold mt-2">{creditsData.chief.name}</h3>
                <p className="text-muted-foreground">{creditsData.chief.title}</p>
                <blockquote className="mt-4 text-lg italic border-l-4 border-primary pl-4">
                    {creditsData.chief.quote}
                </blockquote>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border rounded-lg bg-card shadow-lg px-4">
          <AccordionTrigger className="text-xl hover:no-underline">
             <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6 text-primary" />
                Why This Exists?
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 text-lg text-center">
            {creditsData.why}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border rounded-lg bg-card shadow-lg px-4">
          <AccordionTrigger className="text-xl hover:no-underline">
             <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-primary" />
                Special Mentions
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            {creditsData.mentions.map((mention, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-background">
                    <Heart className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-lg">{mention.name} – <span className="font-normal text-muted-foreground">{mention.title}</span></h4>
                        <p>{mention.reason}</p>
                    </div>
                </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
