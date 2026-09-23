import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth';

export const metadata: Metadata = {
  title: 'Rehearsa — AI Interview Prep Kit Platform',
  description: 'Generate custom, research-backed interview preparation kits with deterministic coverage and practice flashcards.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-brand-500 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
