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
            __html: `window.__ENV = { GAME_SERVER_URL: "${process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL || ''}" }`,
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
