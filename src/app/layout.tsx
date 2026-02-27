import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthSync — AI-Powered Recovery Journey",
  description: "Your intelligent health companion. AI-assisted recovery tracking, medical report analysis, smart doctor discovery, and personalized wellness — all in one premium platform.",
  keywords: "health, AI, recovery, medical, wellness, doctor, telemedicine, India",
  authors: [{ name: "HealthSync Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `
          try {
            var doc = JSON.parse(localStorage.getItem('hs_current_doctor') || 'null');
            var isDocPage = window.location.pathname.startsWith('/doctor');
            if (isDocPage && doc) {
              var dt = localStorage.getItem('healthsync_doctor_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', dt);
            } else {
              var u = JSON.parse(localStorage.getItem('healthsync_current_user') || 'null');
              var t = u && u.theme ? u.theme : 'light';
              document.documentElement.setAttribute('data-theme', t);
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
