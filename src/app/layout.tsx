import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brevia',
  description: 'AI Coaching Platform — turn sessions into structured notes with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
