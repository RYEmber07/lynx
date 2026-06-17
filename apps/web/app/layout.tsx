import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import AuthProvider from "../lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lynx",
  description: "A production-grade URL shortener.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-gray-950 text-gray-100 antialiased min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
