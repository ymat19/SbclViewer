import { GeistMono, GeistSans } from 'geist/font';
import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';

const geistSans = GeistSans;

const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'Anime Song Playlist Creator',
  description: 'Create playlists from your favorite anime songs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
