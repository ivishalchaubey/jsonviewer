import type { Metadata, Viewport } from "next";
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

const SITE_URL = "https://jsonviewer.vishalchaubey.com";
const TITLE = "JSON Viewer – Free Online JSON Formatter, Validator & Tree Viewer";
const DESCRIPTION =
  "A fast, free, modern online JSON viewer, formatter, validator, and minifier. Explore, search and edit JSON with a tree view and full-featured editor. Built by Vishal Chaubey.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · JSON Viewer",
  },
  description: DESCRIPTION,
  applicationName: "JSON Viewer",
  keywords: [
    "JSON viewer",
    "JSON formatter",
    "JSON validator",
    "JSON minifier",
    "online JSON parser",
    "JSON tree view",
    "JSON editor",
    "pretty print JSON",
    "Vishal Chaubey",
  ],
  authors: [{ name: "Vishal Chaubey", url: "https://vishalchaubey.com" }],
  creator: "Vishal Chaubey",
  publisher: "Vishal Chaubey",
  category: "Developer Tools",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "JSON Viewer",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "JSON Viewer" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@vishalchaubey",
    images: ["/icon.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Inline script to prevent flash of wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('json-viewer-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

// schema.org structured data so search engines understand the tool + author.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "JSON Viewer",
      url: SITE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern browser with JavaScript",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: {
        "@type": "Person",
        name: "Vishal Chaubey",
        url: "https://vishalchaubey.com",
      },
    },
    {
      "@type": "WebSite",
      name: "JSON Viewer",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
