import type { Metadata } from "next";
import { ComparePage } from "@/components/compare/ComparePage";

const SITE_URL = "https://jsonviewer.vishalchaubey.com";
const TITLE = "JSON Compare – Free Online JSON Diff & Difference Checker";
const DESCRIPTION =
  "Compare two JSON documents side by side and see added, removed, changed, and type-mismatched fields. Free online JSON diff tool with filtering and a copyable report.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "JSON compare",
    "JSON diff",
    "compare JSON online",
    "JSON difference checker",
    "JSON diff tool",
    "structural JSON diff",
    "Vishal Chaubey",
  ],
  alternates: { canonical: "/compare" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/compare`,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "JSON Viewer",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "JSON Compare" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@vishalchaubey",
    images: ["/icon.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: TITLE,
      url: `${SITE_URL}/compare`,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: {
        "@type": "WebSite",
        name: "JSON Viewer",
        url: SITE_URL,
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "JSON Compare",
      url: `${SITE_URL}/compare`,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: {
        "@type": "Person",
        name: "Vishal Chaubey",
        url: "https://vishalchaubey.com",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "JSON Viewer",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Compare",
          item: `${SITE_URL}/compare`,
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ComparePage />
    </>
  );
}
