import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
          Quiscore
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          A real-time, scalable quiz scoreboard platform.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/create">
            <Button>Create Event</Button>
          </Link>
          <a
            href="#"
            className="text-sm font-semibold leading-6 text-foreground"
          >
            Learn more <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
