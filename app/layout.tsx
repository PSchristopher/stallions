import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPL Stallions Registration',
  description: 'Register players for SPL Stallions Premier League with photo, Aadhaar, and payment proof.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
