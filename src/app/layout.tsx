import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'Smart Packaging Hub | Operational Intelligence Console',
  description:
    'Palantir-style operational intelligence console for flexible packaging supply business in Chennai',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <QueryProvider>
          <Shell>{children}</Shell>
        </QueryProvider>
      </body>
    </html>
  );
}

