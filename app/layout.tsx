import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "Tic-Tac-Toe AI — Unbeatable Minimax",
  description:
    "Challenge an unbeatable AI powered by Minimax + Alpha-Beta Pruning. Choose Easy / Medium / Hard, play as X or O, track your score, and hear satisfying sounds. Works on all devices — completely free!",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Tic-Tac-Toe AI",
    description: "Beat the unbeatable AI — powered by Minimax + Alpha-Beta Pruning",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
