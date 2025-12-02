import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { getStoreConfig } from "@/lib/store-config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getStoreConfig();
  return {
    title: `${config.siteName} - Fresh Subscriptions & Delivery`,
    description: `Subscribe to fresh products delivered to your doorstep from ${config.siteName}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getStoreConfig();
  const theme = config.theme;

  return (
    <html lang="en">
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
        {theme && (
          <style dangerouslySetInnerHTML={{
            __html: `
              :root {
                --primary: ${theme.primaryColor};
                --secondary: ${theme.secondaryColor};
              }
              .text-green-600 { color: var(--primary) !important; }
              .bg-green-600 { background-color: var(--primary) !important; }
              .hover\\:bg-green-700:hover { background-color: color-mix(in srgb, var(--primary), black 10%) !important; }
              .hover\\:text-green-600:hover { color: var(--primary) !important; }
              .border-green-600 { border-color: var(--primary) !important; }
              .text-yellow-500 { color: var(--secondary) !important; }
              .bg-yellow-500 { background-color: var(--secondary) !important; }
            `
          }} />
        )}
      </head>
      <body
        className="font-sans antialiased"
      >
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
