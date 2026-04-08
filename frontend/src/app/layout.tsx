import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SANWANAY NETWORK - FTTH Monitoring Dashboard",
  description: "Advanced FTTH Network Monitoring System",
};

import { SidebarProvider } from "@/context/sidebar-context";
import { AuthGuard } from "@/components/auth-guard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-zinc-50 min-h-screen flex`}
        suppressHydrationWarning
      >
        <SidebarProvider>
          <AuthGuard>
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden w-full relative" suppressHydrationWarning>
              <Navbar />
              <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {children}
              </main>
            </div>
          </AuthGuard>
        </SidebarProvider>
      </body>
    </html>
  );
}
