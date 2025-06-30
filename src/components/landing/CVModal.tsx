"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck, MicVocal } from "lucide-react";

export function CVModal() {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams && searchParams.get("from") === "cv_prabuddha") {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => setIsOpen(false);

  const handleExplore = () => {
    handleClose();
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            👋 Hello there!
          </DialogTitle>
          <div className="pt-4 text-center text-muted-foreground">
            <p className="text-lg">
              You probably found your way here from my CV!
            </p>
            <p className="mt-6 text-xl font-semibold text-primary">
              So, what is <strong>ScorOps</strong>?
            </p>
          </div>
        </DialogHeader>
        <div className="py-6">
          <ul className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Real-time Event Engine</h3>
                <p className="text-muted-foreground">
                  It&apos;s a real-time competitive event platform with Socket.io, dynamic leaderboards, and analytics.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Secure Role-Based Dashboards</h3>
                <p className="text-muted-foreground">
                  Designed secure RBAC dashboards for organizers and judges providing much needed abstraction.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <MicVocal className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI-Powered Judging Assistance</h3>
                <p className="text-muted-foreground">
                  Integrated AI-powered judging assistance via Whisper (OpenAI) and Gemini API for multi-dialect audio transcription.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleExplore}>
            Explore Features
          </Button>
          <Button onClick={handleClose}>Continue to Site</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 