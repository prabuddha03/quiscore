import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/FAQ";
import { Contact } from "@/components/landing/Contact";
import { CVModal } from "@/components/landing/CVModal";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Suspense fallback={<div>Loading...</div>}>
          <CVModal />
        </Suspense>
        <Hero />
        <div id="features">
          <Features />
        </div>
        <Pricing />
        <Faq />
        <Contact />
      </main>
    </div>
  );
}
 