import type { Metadata } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
// Bold display font for headings (gym-poster energy); exposed as --font-display,
// applied globally to h1/h2/h3 in globals.css.
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-display' });

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
      <body className={`${inter.className} ${bebasNeue.variable}`}>
        {/* Watermark background - high z-index to appear above page backgrounds */}
        <div 
          className="app-watermark fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/go-pure-logo.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '40%',
            // The artwork is white + lime; on the light page it has to be knocked
            // down to ink, otherwise the watermark is invisible.
            filter: 'brightness(0)',
            opacity: 0.035,
            zIndex: 40,
          }}
        />
        {/* Content */}
        {children}
      </body>
    </html>
  );
}
