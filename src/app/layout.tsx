import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { UsersProvider } from "@/lib/users-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StudioMate — Kipaworks Studio",
  description:
    "Attendance & Activity Tracker for Kipaworks Studio. Track daily check-ins, activity logs, and team productivity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${openSans.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <UsersProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <Toaster position="top-right" richColors />
          </UsersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
