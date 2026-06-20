import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Book a meeting',
  description: 'Pick an open time slot to book a meeting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
