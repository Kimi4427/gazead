
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AcceptanceBanner } from '@/components/layout/acceptance-banner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'GazeAd',
  description: 'AI-powered gaze tracking for smart ad playback.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Removed Cloudflare Turnstile script */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AcceptanceBanner />
        <div>
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
