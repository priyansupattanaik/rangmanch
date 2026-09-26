import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'RANGMANCH (रंगमंच) — The Stage',
  description: 'Where Stories Become Culture — Screenplay Cultural Adaptation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}
