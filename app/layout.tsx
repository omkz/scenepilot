import type { Metadata, Viewport } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

export const metadata: Metadata = {
  title: 'ScenePilot — Serialized Drama Workspace',
  description: 'Create serialized short dramas with consistent characters, story structure, and production-ready episodes.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#1a1a22',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased font-sans">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
