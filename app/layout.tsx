import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PURE Workouts',
  description: 'Manage your PURE workouts and attendance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Watermark background - high z-index to appear above page backgrounds */}
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/go-pure-logo.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '40%',
            opacity: 0.05,
            zIndex: 40,
          }}
        />
        {/* Content */}
        {children}
      </body>
    </html>
  );
}
