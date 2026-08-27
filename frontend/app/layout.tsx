import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIF Precursor Detection | Oil India Limited',
  description: 'AI-powered Serious Injury & Fatality precursor detection for HSE reports',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}