import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Plinth',
  description: 'Subscription billing engine for Nigerian SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Satoshi via tailwind font-sans; brand fonts are self-hosted @font-face */}
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
