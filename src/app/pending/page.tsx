"use client";

import { Button } from "@/components/ui/button";
import { Clock, Mail } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DC7418]/10">
          <Clock className="h-10 w-10 text-[#DC7418]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Account Pending</h1>
          <p className="mt-2 text-gray-500">Your account is currently being reviewed. We will notify you once it has been approved.</p>
        </div>
        <a href="mailto:support@portico.app">
          <Button variant="outline" className="gap-2"><Mail className="h-4 w-4" />Contact Support</Button>
        </a>
      </div>
    </div>
  );
}
