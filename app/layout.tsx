import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: 'Muqui Plataforma - Red Muqui',
  description: 'Plataforma de Gestión de Proyectos, Informes y Trazabilidad Institucional de Red Muqui',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster richColors closeButton position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
