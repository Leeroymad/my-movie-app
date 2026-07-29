import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-client";
import Nav from "@/components/Nav";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinema Stream",
  description: "Publish, stream and download films — auto-graded quality.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        <AppProvider>
          <AuthProvider>
            <Nav />
            <MobileNav />
            {children}
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
