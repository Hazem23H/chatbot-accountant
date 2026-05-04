import type { Metadata } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['arabic'],
  variable: '--font-ibm-arabic',
})

export const metadata: Metadata = {
  title: 'محاسب السعودية — Saudi Accountant AI',
  description:
    'AI-powered assistant for Saudi accounting, auditing, VAT, Zakat, IFRS, and financial regulations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable}>
      <body className="font-[family-name:var(--font-ibm-arabic)] antialiased">{children}</body>
    </html>
  )
}
