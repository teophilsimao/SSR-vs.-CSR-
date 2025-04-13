import "./globals.css";
import MetricsScript from "./components/MetricsScript";


export const metadata = {
  title: 'SSR vs CSR Metrics',
  description: 'Comparing server-side rendering and client-side rendering performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <MetricsScript />
      </body>
    </html>
  )
}
