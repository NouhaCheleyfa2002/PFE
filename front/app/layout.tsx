import { Geist_Mono, Inter, Syne } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { WebSocketProvider } from "@/lib/websocket-context"
import { Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const syne = Syne({ subsets: ['latin'], variable: '--font-heading' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  title: "EduShare - Collaborative Education Platform",
  description: "Build better exams, share knowledge across Tunisian universities",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, inter.variable, syne.variable)}
    >
      <body className="font-sans">
        <ThemeProvider>
          <WebSocketProvider>
            {children}
            <Toaster />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
