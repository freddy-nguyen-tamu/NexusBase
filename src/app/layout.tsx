import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NexusBase | Collaborative Workspace Platform",
  description:
    "A full-stack team workspace with Google OAuth, AWS file storage, task management, permissions, notifications, chat, and audit logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-nb-bg text-nb-text`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
