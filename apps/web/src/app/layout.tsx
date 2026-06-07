import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "CogniQuest",
  description: "Plataforma de ensino gamificada",
  icons: {
    icon: [{ url: "/logo_icon.svg", type: "image/svg+xml" }],
    shortcut: "/logo_icon.svg",
    apple: "/logo_icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  headers(); // Force dynamic rendering so process.env is read at request time
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = { 
              GAME_SERVER_URL: "${process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL || ''}",
              TURNSTILE_SITE_KEY: "${process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}"
            }`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-[#05070F] text-white`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
