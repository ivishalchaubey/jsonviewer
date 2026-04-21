import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JSON Viewer – Fast Online Formatter by Vishal Chaubey",
  description:
    "Modern, fast JSON viewer and formatter with tree view, file import, and copy/download support. Built by Vishal Chaubey (vishalchaubey.com).",
  authors: [{ name: "Vishal Chaubey", url: "https://vishalchaubey.com" }],
  creator: "Vishal Chaubey",
  openGraph: {
    title: "JSON Viewer – Fast Online Formatter",
    description:
      "Modern, fast JSON viewer and formatter with tree view, file import, and copy/download support.",
    url: "https://vishalchaubey.com",
    siteName: "JSON Viewer by Vishal Chaubey",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
  },
};

// Inline script to prevent flash of wrong theme
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('json-viewer-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
