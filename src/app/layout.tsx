import type { Metadata } from "next";
import { Figtree, Noto_Sans, Noto_Sans_Tamil, Noto_Sans_Telugu, Noto_Sans_Bengali } from "next/font/google";
import SyncGate from "@/components/SyncGate";
import "./globals.css";

// Figtree for headings, Noto Sans for body: Noto covers Devanagari (Hindi/Marathi) and,
// with the script families below, Tamil/Telugu/Bengali. Script fonts only download when those glyphs render.
const heading = Figtree({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = Noto_Sans({ subsets: ["latin", "devanagari"], variable: "--font-body", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", display: "swap", preload: false });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-telugu", display: "swap", preload: false });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "HealthSync — Connected care from symptom to recovery",
  description: "Book doctors, share reports, take video consultations and follow your care plan — one connected health record for patients, doctors and hospitals across India, linked with ABHA.",
  keywords: "health, telemedicine, doctor consultation, ABHA, medical records, recovery, India",
  authors: [{ name: "HealthSync Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${heading.variable} ${body.variable} ${tamil.variable} ${telugu.variable} ${bengali.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          try {
            var path = window.location.pathname;
            var isPatientApp = path.startsWith('/journey') || path.startsWith('/recovery') || path.startsWith('/settings');
            if (isPatientApp) {
              var u = JSON.parse(localStorage.getItem('healthsync_current_user') || 'null');
              var t = u && u.theme ? u.theme : 'light';
              document.documentElement.setAttribute('data-theme', t);
            } else {
              document.documentElement.setAttribute('data-theme', 'light');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <SyncGate>{children}</SyncGate>
      </body>
    </html>
  );
}
