import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Portico CRM",
  description: "CRM for contractors and restoration companies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {children}
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
