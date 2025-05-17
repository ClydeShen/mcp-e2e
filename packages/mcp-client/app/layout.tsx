import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from "next/font/google"; // Removing default fonts for now, can be re-added if needed
// import "./globals.css"; // MUI's CssBaseline will handle base styling
import ThemeRegistry from '@/theme/ThemeRegistry'; // Updated import path

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: 'MCP Client', // Updated title
  description: 'Model Context Protocol Client Application', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      {/* <body className={`${geistSans.variable} ${geistMono.variable}`}> */}
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
