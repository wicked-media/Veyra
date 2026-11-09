import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Veyra — Legal practice operating system",
    template: "%s · Veyra"
  },
  description:
    "Veyra is an Australian legal practice operating system: matters, clients, documents, workflows, billing and matter-aware AI in one secure platform.",
  applicationName: "Veyra",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#08161d" }
  ]
};

const themeScript = `(function(){try{var stored=localStorage.getItem("veyra-theme");var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=stored==="dark"||(stored!=="light"&&prefersDark);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
