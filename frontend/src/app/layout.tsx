import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'RANGMANCH (रंगमंच) | Netflix Studio Cultural Adaptation',
  description: 'The Stage — Where Stories Become Culture. Production-Grade Cultural Adaptation Engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#141414]">
      <body className="min-h-screen bg-[#141414] text-[#e5e5e5] flex flex-col selection:bg-[#E50914] selection:text-white antialiased">
        <Navbar />
        <main className="flex-1 w-full pb-16">{children}</main>
      </body>
    </html>
  );
}
