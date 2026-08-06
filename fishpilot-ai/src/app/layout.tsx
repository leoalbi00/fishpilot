import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Work_Sans, JetBrains_Mono } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { AppPreferencesProvider } from "@/components/AppPreferencesProvider";
import "./globals.css";

// Applica il tema salvato (o il default Chiaro) PRIMA dell'idratazione
// React, per evitare un flash del tema sbagliato al primo caricamento.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("fishpilot_theme");if(t!=="night"&&t!=="sunhigh"&&t!=="day"&&t!=="light")t="light";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}`;

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FishPilot AI — Pesca e Rada",
  description:
    "Meteo marino, Fishing Score, solunari, maree e sicurezza in rada (Shelter Score, Anchor Watch) per chi va per mare.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FishPilot",
  },
  other: {
    // Next genera già "mobile-web-app-capable" da appleWebApp.capable; qui
    // aggiungiamo solo la variante legacy per iOS Safari più datati.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${spaceGrotesk.variable} ${workSans.variable} ${jetbrainsMono.variable}`}
      // data-theme è impostato da THEME_INIT_SCRIPT (sotto) PRIMA
      // dell'idratazione, apposta per evitare il flash del tema sbagliato:
      // React non lo vede mai nel proprio render, quindi lo segnalerebbe
      // come mismatch senza questo flag (comportamento voluto, non un bug).
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppPreferencesProvider>
          <ServiceWorkerRegister />
          {children}
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
