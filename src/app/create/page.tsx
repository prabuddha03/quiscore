import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreatePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md p-8 m-4 text-center shadow-xl">
        <CardHeader>
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Rocket className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            Premium Is Launching Soon!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mt-2 text-lg text-muted-foreground">
            We&apos;re putting the final touches on our new premium features.
          </p>
          <p className="mt-4 text-md">
            For now, service is restricted to <strong>2 events</strong> per account. Stay tuned for the upgrade!
          </p>
        </CardContent>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
} 