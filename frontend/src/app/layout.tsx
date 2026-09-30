import type { Metadata } from 'next';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { AuthModal } from '../components/modals/AuthModal';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zoom Clone — Video Conferencing Platform',
  description: 'A modern, responsive Zoom Web App Clone built with Next.js, FastAPI, and SQLite.',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#111317] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        <ToastProvider>
          <AuthProvider>
            {children}
            <AuthModal />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
